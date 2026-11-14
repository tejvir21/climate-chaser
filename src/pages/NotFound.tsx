import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Compass size={44} aria-hidden="true" className="text-[var(--accent)]" />
      <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--text)]">
        Lost in the forecast
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--text-dim)]">
        This page doesn&rsquo;t exist. The wind may have carried it elsewhere.
      </p>
      <Link to="/" className="mt-6">
        <Button>Take me home</Button>
      </Link>
    </div>
  );
}

