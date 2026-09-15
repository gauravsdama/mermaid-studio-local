import AppKit
import Darwin
import SwiftUI
import WebKit

private final class RuntimeServer: @unchecked Sendable {
  static let shared = RuntimeServer()

  private let lock = NSLock()
  private var server: Process?
  let port: Int

  private init() {
    let configured = Int(ProcessInfo.processInfo.environment["MERMAID_STUDIO_PORT"] ?? "")
    port = configured.flatMap { (1024...65535).contains($0) ? $0 : nil } ?? 8787
  }

  var url: URL { URL(string: "http://127.0.0.1:\(port)")! }

  func startIfNeeded(then load: @escaping @Sendable (Bool) -> Void) {
    DispatchQueue.global(qos: .userInitiated).async {
      if self.isReachable() {
        load(true)
        return
      }
      guard let root = self.projectRoot() else {
        load(false)
        return
      }
      let process = Process()
      process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
      process.arguments = ["node", "dist/server/index.js"]
      process.currentDirectoryURL = root
      var environment = ProcessInfo.processInfo.environment
      environment["PORT"] = String(self.port)
      process.environment = environment
      process.standardOutput = FileHandle.nullDevice
      process.standardError = FileHandle.nullDevice
      do {
        try process.run()
        self.lock.withLock { self.server = process }
      } catch {
        load(false)
        return
      }
      for _ in 0..<50 {
        if self.isReachable() {
          load(true)
          return
        }
        if !process.isRunning { break }
        Thread.sleep(forTimeInterval: 0.1)
      }
      self.stop()
      load(false)
    }
  }

  func stop() {
    let process = lock.withLock { () -> Process? in
      defer { server = nil }
      return server
    }
    guard let process, process.isRunning else { return }
    process.terminate()
    let deadline = Date().addingTimeInterval(1)
    while process.isRunning && Date() < deadline { Thread.sleep(forTimeInterval: 0.02) }
    if process.isRunning { kill(process.processIdentifier, SIGKILL) }
    process.waitUntilExit()
  }

  private func isReachable() -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var reachable = false
    var request = URLRequest(url: url.appendingPathComponent("health"))
    request.timeoutInterval = 0.8
    URLSession.shared.dataTask(with: request) { _, response, _ in
      reachable = (response as? HTTPURLResponse)?.statusCode == 200
      semaphore.signal()
    }.resume()
    _ = semaphore.wait(timeout: .now() + 1)
    return reachable
  }

  private func projectRoot() -> URL? {
    let fileManager = FileManager.default
    var url = URL(fileURLWithPath: fileManager.currentDirectoryPath)
    while url.path != "/" {
      let package = url.appendingPathComponent("package.json").path
      let server = url.appendingPathComponent("dist/server/index.js").path
      if fileManager.fileExists(atPath: package), fileManager.fileExists(atPath: server) { return url }
      url.deleteLastPathComponent()
    }
    return nil
  }
}

private final class AppDelegate: NSObject, NSApplicationDelegate {
  private var signalSources: [DispatchSourceSignal] = []

  func applicationDidFinishLaunching(_ notification: Notification) {
    for value in [SIGINT, SIGTERM] {
      signal(value, SIG_IGN)
      let source = DispatchSource.makeSignalSource(signal: value, queue: .global(qos: .userInitiated))
      source.setEventHandler {
        RuntimeServer.shared.stop()
        exit(0)
      }
      source.resume()
      signalSources.append(source)
    }
  }

  func applicationWillTerminate(_ notification: Notification) {
    RuntimeServer.shared.stop()
  }
}

@main
struct MermaidStudioViewerApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

  var body: some Scene {
    WindowGroup("Mermaid Studio") {
      StudioWebView()
        .frame(minWidth: 720, minHeight: 560)
    }
  }
}

private struct StudioWebView: NSViewRepresentable {
  func makeCoordinator() -> Coordinator { Coordinator() }

  func makeNSView(context: Context) -> WKWebView {
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .default()
    let view = WKWebView(frame: .zero, configuration: configuration)
    RuntimeServer.shared.startIfNeeded { ready in
      DispatchQueue.main.async {
        if ready {
          view.load(URLRequest(url: RuntimeServer.shared.url))
        } else {
          view.loadHTMLString("<main><h1>Mermaid Studio could not start</h1><p>Run npm run build in the project folder, then reopen the viewer.</p></main>", baseURL: nil)
        }
      }
    }
    return view
  }

  func updateNSView(_ nsView: WKWebView, context: Context) {}

  final class Coordinator {}
}

private extension NSLock {
  func withLock<T>(_ operation: () -> T) -> T {
    lock()
    defer { unlock() }
    return operation()
  }
}
