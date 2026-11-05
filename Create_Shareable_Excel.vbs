Option Explicit
' Label Photo Register V2.2.2 - Windows desktop Excel shareable workbook creator.
' No macros are executed during creation; VBA is imported into an IT-approved local template.
' All photos stay on the local PC. Use only on trusted files in compliance with IT policy.

Const XLSM_FORMAT = 52
Const SHAPE_PICTURE = 13
Const SHAPE_LINKED_PICTURE = 11
Const TEMPLATE_STAMP = "LPR_ZOOM_TEMPLATE_V222"
Const MACRO_ACTION = "LabelPhotoZoom.TogglePhotoZoom"
Dim fso, shell, folder, inputFile, moduleFile, templateDir, masterFile, outputFile
Dim app, sourceWb, targetWb, verifyWb, newSheet, shape, vbComp, templateSheet
Dim x, photoCount, verifiedPhotos, stamp, codeText
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
inputFile = fso.BuildPath(folder,"Label_Photos_Data.xlsx")
moduleFile = fso.BuildPath(folder,"LabelPhotoZoom.bas")
If Not fso.FileExists(inputFile) Then StopWith "Label_Photos_Data.xlsx is missing. Extract all 4 files into ONE folder."
If Not fso.FileExists(moduleFile) Then StopWith "LabelPhotoZoom.bas is missing. Extract all 4 files into ONE folder."
templateDir = fso.BuildPath(shell.ExpandEnvironmentStrings("%APPDATA%"),"LabelPhotoRegister")
If Not fso.FolderExists(templateDir) Then fso.CreateFolder templateDir
' A versioned template prevents use of an old/broken local master from V2.2.
masterFile = fso.BuildPath(templateDir,"PhotoZoom_Master_V222.xlsm")

On Error Resume Next
Set app = CreateObject("Excel.Application")
If Err.Number <> 0 Then StopWith "Microsoft Excel desktop could not start: " & Err.Description
Err.Clear
app.Visible = False
app.DisplayAlerts = False
app.AutomationSecurity = 3 ' Never run workbook macros while generating files.

If Not fso.FileExists(masterFile) Then
    Set targetWb = app.Workbooks.Add()
    If Err.Number <> 0 Then StopWith "Could not create the macro template: " & Err.Description
    Err.Clear
    Set templateSheet = targetWb.Worksheets(1)
    templateSheet.Name = "TemplateInfo"
    For x = targetWb.Worksheets.Count To 2 Step -1
        targetWb.Worksheets(x).Delete
    Next
    Err.Clear
    Set vbComp = targetWb.VBProject.VBComponents.Import(moduleFile)
    If Err.Number <> 0 Or vbComp Is Nothing Then
        StopWith "FIRST-TIME EXCEL SETUP REQUIRED." & vbCrLf & _
          "The workbook could not import the photo-zoom VBA module." & vbCrLf & _
          "Ask your company IT team to approve this tool and any required settings." & vbCrLf & _
          "Technical detail: " & Err.Description
    End If
    Err.Clear
    If LCase(CStr(vbComp.Name)) <> "labelphotozoom" Then StopWith "Unexpected VBA module name. Expected LabelPhotoZoom; got: " & CStr(vbComp.Name)
    Err.Clear
    codeText = vbComp.CodeModule.Lines(1, vbComp.CodeModule.CountOfLines)
    If Err.Number <> 0 Then StopWith "Cannot validate VBA procedures: " & Err.Description
    If InStr(1, codeText, "Public Sub TogglePhotoZoom()", 1) = 0 Then StopWith "TogglePhotoZoom is missing from the VBA module. No file created."
    If InStr(1, codeText, "Public Sub RestoreAllZoomedPhotos()", 1) = 0 Then StopWith "RestoreAllZoomedPhotos is missing from the VBA module. No file created."
    templateSheet.Range("A1").Value = "Label Photo Register - audited local VBA template"
    templateSheet.Range("B1").Value = TEMPLATE_STAMP
    templateSheet.Range("B2").Value = "LabelPhotoZoom.TogglePhotoZoom"
    Err.Clear
    targetWb.SaveAs masterFile, XLSM_FORMAT
    If Err.Number <> 0 Then StopWith "Cannot save the local macro template: " & Err.Description
    targetWb.Close False
    Set targetWb = Nothing
    Set vbComp = Nothing
    Set templateSheet = Nothing
End If

Err.Clear
Set targetWb = app.Workbooks.Open(masterFile, 0, False)
If Err.Number <> 0 Or targetWb Is Nothing Then StopWith "Could not open the local macro template: " & Err.Description
Err.Clear
If Not targetWb.HasVBProject Then StopWith "The local template has no VBA project. Contact IT to review and rebuild it."
If Err.Number <> 0 Then StopWith "Could not check the template VBA project: " & Err.Description
Err.Clear
Set templateSheet = targetWb.Worksheets("TemplateInfo")
If Err.Number <> 0 Or templateSheet Is Nothing Then StopWith "Unrecognized local template. Ask IT to review the local template."
If CStr(templateSheet.Range("B1").Value) <> TEMPLATE_STAMP Then StopWith "The local photo-zoom template is out of date. Contact IT before replacing it."
Err.Clear
Set sourceWb = app.Workbooks.Open(inputFile, 0, True)
If Err.Number <> 0 Or sourceWb Is Nothing Then StopWith "Cannot open Label_Photos_Data.xlsx: " & Err.Description
Err.Clear
Set newSheet = sourceWb.Worksheets("Label Records")
If Err.Number <> 0 Or newSheet Is Nothing Then StopWith "No 'Label Records' sheet in Label_Photos_Data.xlsx."
Err.Clear
newSheet.Copy , targetWb.Worksheets(targetWb.Worksheets.Count)
If Err.Number <> 0 Then StopWith "Cannot copy label records and photos into the macro workbook: " & Err.Description
For x = targetWb.Worksheets.Count To 1 Step -1
    If targetWb.Worksheets(x).Name <> "Label Records" Then targetWb.Worksheets(x).Delete
Next
sourceWb.Close False
Set sourceWb = Nothing

photoCount = 0
For Each shape In targetWb.Worksheets("Label Records").Shapes
    If shape.Type = SHAPE_PICTURE Or shape.Type = SHAPE_LINKED_PICTURE Then
        If shape.TopLeftCell.Row >= 4 And shape.TopLeftCell.Column >= 1 And shape.TopLeftCell.Column <= 3 Then
            Err.Clear
            shape.OnAction = MACRO_ACTION
            If Err.Number <> 0 Then StopWith "Failed to link a photo to the zoom macro: " & Err.Description
            photoCount = photoCount + 1
        End If
    End If
Next
If photoCount = 0 Then StopWith "NO photos were found in Excel columns A-C from row 4. No shareable file created."

stamp = Year(Now) & Pad2(Month(Now)) & Pad2(Day(Now)) & "_" & Pad2(Hour(Now)) & Pad2(Minute(Now)) & Pad2(Second(Now))
outputFile = fso.BuildPath(folder,"Label_Photos_Ready_to_Share_" & stamp & ".xlsm")
If Not targetWb.HasVBProject Then StopWith "VBA project was lost. No shareable file created."
Err.Clear
targetWb.SaveAs outputFile, XLSM_FORMAT
If Err.Number <> 0 Then StopWith "Failed to save final .xlsm: " & Err.Description
Err.Clear
targetWb.Close False
Set targetWb = Nothing

' Reopen with macros NOT executed to verify the VBA container and the saved photo links.
Err.Clear
Set verifyWb = app.Workbooks.Open(outputFile, 0, True)
If Err.Number <> 0 Or verifyWb Is Nothing Then StopWith "Failed to reopen the final Excel file for verification: " & Err.Description
If Not verifyWb.HasVBProject Then StopWith "Verification FAILED: final Excel workbook has no VBA project."
verifiedPhotos = 0
For Each shape In verifyWb.Worksheets("Label Records").Shapes
    If InStr(1, CStr(shape.OnAction), MACRO_ACTION, 1) > 0 Then verifiedPhotos = verifiedPhotos + 1
Next
If verifiedPhotos <> photoCount Then StopWith "Verification FAILED: not all photo links were saved. Linked " & photoCount & ", verified " & verifiedPhotos & "."
verifyWb.Close False
Set verifyWb = Nothing
app.Quit
Set app = Nothing
On Error GoTo 0
MsgBox "SHAREABLE EXCEL CREATED." & vbCrLf & _
       "Photos linked: " & photoCount & vbCrLf & _
       "VBA container and links: verified" & vbCrLf & _
       "File: " & outputFile & vbCrLf & vbCrLf & _
       "IMPORTANT: The conversion check does not prove that macros can run on another PC." & vbCrLf & _
       "Before sending, open the file in desktop Excel and test one photo with IT-approved macro permissions.", _
       vbInformation, "Label Photo Register V2.2.2"
shell.Run "explorer.exe /select,""" & outputFile & """", 1, False

Function Pad2(value)
    Pad2 = Right("0" & CStr(value),2)
End Function

Sub StopWith(message)
    On Error Resume Next
    If Not verifyWb Is Nothing Then verifyWb.Close False
    If Not sourceWb Is Nothing Then sourceWb.Close False
    If Not targetWb Is Nothing Then targetWb.Close False
    If Not app Is Nothing Then app.Quit
    MsgBox message, vbExclamation, "Label Photo Register - Excel creator"
    WScript.Quit 1
End Sub
