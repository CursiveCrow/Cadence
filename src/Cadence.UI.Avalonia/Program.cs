using Avalonia;
using System;

namespace Cadence.UI;

class Program
{
    [STAThread]
    public static void Main(string[] args) => BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
             .UsePlatformDetect()
             .LogToTrace();
}
