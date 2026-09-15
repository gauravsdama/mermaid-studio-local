// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "MermaidStudioViewer",
  platforms: [.macOS(.v14)],
  products: [.executable(name: "MermaidStudioViewer", targets: ["MermaidStudioViewer"])],
  targets: [.executableTarget(name: "MermaidStudioViewer")]
)
