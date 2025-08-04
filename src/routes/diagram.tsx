import { createFileRoute } from '@tanstack/react-router'
import { Excalidraw } from "@excalidraw/excalidraw";
import '@excalidraw/excalidraw/index.css';
import { useTheme } from '@/components/theme-provider';

export const Route = createFileRoute('/diagram')({
  component: Diagram,
})

function Diagram() {

  const { theme } = useTheme()

  return <div className="w-screen h-screen">
      <Excalidraw theme={theme} />
  </div>;
}
