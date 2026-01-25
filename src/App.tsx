import { Toolbar, Sidebar, EditorCanvas, PropertiesPanel } from './components';

function App() {
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Block Palette */}
        <Sidebar />

        {/* Center - Editor Canvas */}
        <EditorCanvas />

        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
