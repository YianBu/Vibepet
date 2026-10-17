
using System;
using System.Diagnostics;

public class Launcher {
  public static void Main() {
    string exe = @"E:\360MoveData\Users\67400\Desktop\vibepet\windows-portable\agentpet.exe";
    string wd = @"E:\360MoveData\Users\67400\Desktop\vibepet\windows-portable";
    string ps1 = @"E:\360MoveData\Users\67400\Desktop\vibepet\ocx-hud\ocx-start.ps1";
    Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--remote-debugging-port=9339", EnvironmentVariableTarget.Process);
    var p1 = new ProcessStartInfo(exe);
    p1.WorkingDirectory = wd;
    p1.UseShellExecute = false;
    Process.Start(p1);
    var p2 = new ProcessStartInfo(@"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe");
    p2.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + ps1 + "\"";
    p2.UseShellExecute = false;
    p2.CreateNoWindow = true;
    Process.Start(p2);
  }
}

