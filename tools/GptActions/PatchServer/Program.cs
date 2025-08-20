using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Very simple Bearer token gate
string? token = builder.Configuration["PATCH_TOKEN"];
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/health"))
    {
        await next(ctx);
        return;
    }
    if (!ctx.Request.Headers.TryGetValue("Authorization", out var auth) || !auth.ToString().StartsWith("Bearer "))
    {
        ctx.Response.StatusCode = 401; return;
    }
    var provided = auth.ToString().Substring("Bearer ".Length);
    if (string.IsNullOrWhiteSpace(token) || provided != token) { ctx.Response.StatusCode = 403; return; }
    await next(ctx);
});

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.MapPost("/branch", (BranchReq req) =>
{
    return RunGit($"checkout -B {req.Name}");
});

app.MapPost("/apply", async (HttpRequest req) =>
{
    using var reader = new StreamReader(req.Body);
    var patch = await reader.ReadToEndAsync();
    var tmp = Path.GetTempFileName();
    await File.WriteAllTextAsync(tmp, patch);
    var r1 = RunGit($"apply --index "{tmp}"");
    File.Delete(tmp);
    return r1;
});

app.MapPost("/commit", (CommitReq req) =>
{
    return RunGit($"commit -m "{req.Message.Replace(""","'")}"");
});

app.MapPost("/push", (PushReq req) =>
{
    return RunGit($"push origin HEAD:{req.Branch}");
});

app.MapPost("/pr", async (PrReq req) =>
{
    // naive GitHub API call using gh CLI if available
    var title = req.Title.Replace(""","'");
    return RunProc("gh", $"pr create --title "{title}" --base {req.Base} --head {req.Head} --repo {req.Owner}/{req.Repo}");
});

IResult RunGit(string args) => RunProc("git", args);
IResult RunProc(string exe, string args)
{
    var psi = new ProcessStartInfo(exe, args)
    {
        RedirectStandardOutput = true,
        RedirectStandardError = true
    };
    var p = Process.Start(psi)!;
    p.WaitForExit();
    var outp = p.StandardOutput.ReadToEnd();
    var err = p.StandardError.ReadToEnd();
    return Results.Json(new { exitCode = p.ExitCode, stdout = outp, stderr = err });
}

app.Run();

record BranchReq(string Name);
record CommitReq(string Message);
record PushReq(string Branch);
record PrReq(string Owner, string Repo, string Title, string Head, string Base);
