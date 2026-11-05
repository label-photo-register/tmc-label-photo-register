Option Explicit
' Label Photo Register V2.2 - local Windows Excel shareable workbook creator.
' Only works with installed desktop Microsoft Excel on Windows.
' On first use: Excel must allow access to VBA project object model (company IT policy applies).
' Subsequent uses: a macro-enabled master template in %%APPDATA%% is reused.
' No photo or material information is uploaded by this helper.

Const XLSM_FORMAT = 52
Const SHAPE_PICTURE = 13
Const SHAPE_LINKED_PICTURE = 11
Dim fso, shell, folder, inputFile, moduleFile, templateDir, masterFile, outputFile
Dim app, sourceWb, targetWb, newSheet, shape, vbComp, x, photoCount, stamp
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
inputFile = fso.BuildPath(folder,"Label_Photos_Data.xlsx")
moduleFile = fso.BuildPath(folder,"LabelPhotoZoom.bas")
If Not fso.FileExists(inputFile) Then StopWith "Label_Photos_Data.xlsx is missing. Extract all ZIP files into ONE folder."
If Not fso.FileExists(moduleFile) Then StopWith "LabelPhotoZoom.bas is missing. Extract all ZIP files into ONE folder."
templateDir = fso.BuildPath(shell.ExpandEnvironmentStrings("%APPDATA%"),"LabelPhotoRegister")
If Not fso.FolderExists(templateDir) Then fso.CreateFolder templateDir
masterFile = fso.BuildPath(templateDir,"PhotoZoom_Master.xlsm")

On Error Resume Next
Set app = CreateObject("Excel.Application")
If Err.Number <> 0 Then StopWith "Could not start desktop Microsoft Excel. Please check that Excel is installed." & vbCrLf & Err.Description
Err.Clear
app.Visible = False
app.DisplayAlerts = False
app.AutomationSecurity = 3 ' Prevent macros running automatically while the converter opens workbooks.

If Not fso.FileExists(masterFile) Then
    Set targetWb = app.Workbooks.Add()
    If Err.Number <> 0 Then StopWith "Could not create Excel template: " & Err.Description
    Err.Clear
    targetWb.Worksheets(1).Name = "TemplateInfo"
    targetWb.Worksheets(1).Range("A1").Value = "Label Photo Register: macro-enabled template"
    For x = targetWb.Worksheets.Count To 2 Step -1
        targetWb.Worksheets(x).Delete
    Next
    Err.Clear
    Set vbComp = targetWb.VBProject.VBComponents.Import(moduleFile)
    If Err.Number <> 0 Then
        StopWith "FIRST-USE SETUP REQUIRED:" & vbCrLf & _
          "Excel denied VBA project access. Ask your IT administrator for approval." & vbCrLf & _
          "Excel > File > Options > Trust Center > Trust Center Settings > Macro Settings" & vbCrLf & _
          "> Trust access to the VBA project object model." & vbCrLf & _
          "This is required ONCE to create the local template. Turn it off afterwards if desired." & vbCrLf & _
          "Technical detail: " & Err.Description
    End If
    Err.Clear
    targetWb.SaveAs masterFile, XLSM_FORMAT
    If Err.Number <> 0 Then StopWith "Cannot save local macro template: " & Err.Description
    targetWb.Close False
    Set targetWb = Nothing
End If

Err.Clear
Set targetWb = app.Workbooks.Open(masterFile, 0, False)
If Err.Number <> 0 Then StopWith "Cannot open macro template: " & Err.Description
Err.Clear
Set sourceWb = app.Workbooks.Open(inputFile, 0, True)
If Err.Number <> 0 Then StopWith "Cannot open exported .xlsx: " & Err.Description
Err.Clear
Set newSheet = sourceWb.Worksheets("Label Records")
If Err.Number <> 0 Then StopWith "The Excel file has no 'Label Records' worksheet."
Err.Clear
newSheet.Copy , targetWb.Worksheets(targetWb.Worksheets.Count)
If Err.Number <> 0 Then StopWith "Cannot copy label records and photos into macro workbook: " & Err.Description
Err.Clear
For x = targetWb.Worksheets.Count To 1 Step -1
    If targetWb.Worksheets(x).Name <> "Label Records" Then targetWb.Worksheets(x).Delete
Next
sourceWb.Close False
Set sourceWb = Nothing

stamp = Year(Now) & Pad2(Month(Now)) & Pad2(Day(Now)) & "_" & Pad2(Hour(Now)) & Pad2(Minute(Now)) & Pad2(Second(Now))
outputFile = fso.BuildPath(folder,"Label_Photos_Ready_to_Share_" & stamp & ".xlsm")
Err.Clear
targetWb.SaveAs outputFile, XLSM_FORMAT
If Err.Number <> 0 Then StopWith "Cannot save the shareable .xlsm: " & Err.Description

photoCount = 0
For Each shape In targetWb.Worksheets("Label Records").Shapes
    If shape.Type = SHAPE_PICTURE Or shape.Type = SHAPE_LINKED_PICTURE Then
        If shape.TopLeftCell.Row >= 4 And shape.TopLeftCell.Column >= 1 And shape.TopLeftCell.Column <= 3 Then
            shape.OnAction = "TogglePhotoZoom"
            photoCount = photoCount + 1
        End If
    End If
Next
Err.Clear
targetWb.Save
If Err.Number <> 0 Then StopWith "Could not save linked photo actions: " & Err.Description

On Error Resume Next
targetWb.Close False
app.Quit
Set app = Nothing
On Error GoTo 0
MsgBox "Shareable Excel created successfully!" & vbCrLf & _
       "Images linked for zoom: " & photoCount & vbCrLf & _
       "File: " & outputFile & vbCrLf & vbCrLf & _
       "Send ONLY the .xlsm file to colleagues. Macro use requires their Excel security policy to allow it.", _
       vbInformation, "Label Photo Register V2.2"
shell.Run "explorer.exe /select,""" & outputFile & """", 1, False

Function Pad2(value)
    Pad2 = Right("0" & CStr(value),2)
End Function

Sub StopWith(message)
    On Error Resume Next
    If Not sourceWb Is Nothing Then sourceWb.Close False
    If Not targetWb Is Nothing Then targetWb.Close False
    If Not app Is Nothing Then app.Quit
    MsgBox message, vbExclamation, "Label Photo Register - Excel creator"
    WScript.Quit 1
End Sub
