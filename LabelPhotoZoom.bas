Attribute VB_Name = "LabelPhotoZoom"
Option Explicit

'Label Photo Register: desktop Excel photo preview for the existing A:C thumbnails.
'This code must be imported into an exported workbook and saved as .xlsm.
'It does NOT delete, move permanently, or replace any photos/label data.
Private Const ZOOM_TAG As String = "LPRZOOM_V1|"
Private Const PHOTO_SHEET As String = "Label Records"
Private Const AUTO_RETURN_SECONDS As Long = 9
Private scheduledTime As Date
Private timerActive As Boolean

Public Sub InstallPhotoZoom()
    Dim ws As Worksheet, s As Shape, n As Long
    On Error GoTo Failed
    Set ws = ThisWorkbook.Worksheets(PHOTO_SHEET)
    RestoreAllZoomedPhotos
    For Each s In ws.Shapes
        If s.Type = msoPicture Or s.Type = msoLinkedPicture Then
            If s.TopLeftCell.Row >= 4 And s.TopLeftCell.Column <= 3 And s.TopLeftCell.Column >= 1 Then
                s.OnAction = "LabelPhotoZoom.TogglePhotoZoom"
                n = n + 1
            End If
        End If
    Next s
    MsgBox "Photo zoom enabled for " & n & " photos." & vbCrLf & _
           "Click a thumbnail to enlarge it. Click again to restore, or wait " & _
           AUTO_RETURN_SECONDS & " seconds.", vbInformation, "Label Photo Register"
    Exit Sub
Failed:
    MsgBox "Could not activate photo zoom: " & Err.Description, vbExclamation
End Sub

Public Sub CheckPhotoZoomReady()
    MsgBox "This workbook contains the photo-zoom VBA module." & vbCrLf & _
           "If your company's Excel policy permits macros, click a thumbnail to test zoom.", _
           vbInformation, "Label Photo Register"
End Sub

Public Sub TogglePhotoZoom()
    Dim ws As Worksheet, s As Shape, wasLarge As Boolean
    Dim left0 As Double, top0 As Double, width0 As Double, height0 As Double
    Dim placement0 As Long, oldAlt As String, magnification As Double
    On Error GoTo Failed
    Set ws = ThisWorkbook.Worksheets(PHOTO_SHEET)
    Set s = ws.Shapes(CStr(Application.Caller))
    wasLarge = (Left$(s.AlternativeText, Len(ZOOM_TAG)) = ZOOM_TAG)
    RestoreAllZoomedPhotos
    If wasLarge Then Exit Sub
    left0 = s.Left: top0 = s.Top
    width0 = s.Width: height0 = s.Height
    placement0 = CLng(s.Placement)
    oldAlt = s.AlternativeText
    'Store the exact original geometry in the picture itself, for reliable restoration.
    s.AlternativeText = ZOOM_TAG & CStr(left0) & "|" & CStr(top0) & "|" & _
                        CStr(width0) & "|" & CStr(height0) & "|" & _
                        CStr(placement0) & "|" & oldAlt
    magnification = 3.7
    If width0 * magnification > 340 Then magnification = 340 / width0
    If height0 * magnification > 340 Then magnification = 340 / height0
    s.Placement = xlFreeFloating
    s.LockAspectRatio = msoFalse
    s.Width = width0 * magnification
    s.Height = height0 * magnification
    'Move the larger photo slightly into the working area to avoid left/top clipping.
    s.Left = left0 + 25
    s.Top = top0 + 10
    s.ZOrder msoBringToFront
    'Auto-restore after a short preview, with an immediate second-click toggle.
    scheduledTime = Now + TimeSerial(0, 0, AUTO_RETURN_SECONDS)
    timerActive = True
    Application.OnTime EarliestTime:=scheduledTime, _
      Procedure:="'" & Replace(ThisWorkbook.Name, "'", "''") & "'!RestoreAllZoomedPhotos", _
      Schedule:=True
    Exit Sub
Failed:
    MsgBox "Photo preview error: " & Err.Description, vbExclamation
    RestoreAllZoomedPhotos
End Sub

Public Sub RestoreAllZoomedPhotos()
    Dim ws As Worksheet, s As Shape, a() As String
    Dim originalAlt As String, k As Long
    CancelZoomTimer
    On Error GoTo Done
    Set ws = ThisWorkbook.Worksheets(PHOTO_SHEET)
    For Each s In ws.Shapes
        If Left$(s.AlternativeText, Len(ZOOM_TAG)) = ZOOM_TAG Then
            a = Split(Mid$(s.AlternativeText, Len(ZOOM_TAG) + 1), "|")
            If UBound(a) >= 5 Then
                s.LockAspectRatio = msoFalse
                s.Left = CDbl(a(0))
                s.Top = CDbl(a(1))
                s.Width = CDbl(a(2))
                s.Height = CDbl(a(3))
                s.Placement = CLng(a(4))
                originalAlt = a(5)
                If UBound(a) > 5 Then
                    For k = 6 To UBound(a)
                        originalAlt = originalAlt & "|" & a(k)
                    Next k
                End If
                s.AlternativeText = originalAlt
                s.LockAspectRatio = msoTrue
            End If
        End If
    Next s
Done:
End Sub

Public Sub CancelZoomTimer()
    On Error Resume Next
    If timerActive Then
        Application.OnTime EarliestTime:=scheduledTime, _
          Procedure:="'" & Replace(ThisWorkbook.Name, "'", "''") & "'!RestoreAllZoomedPhotos", _
          Schedule:=False
    End If
    timerActive = False
    On Error GoTo 0
End Sub
