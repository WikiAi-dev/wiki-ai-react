import ReactMarkdown, { type Components } from "react-markdown"
import { cn } from "@/lib/utils"

const components: Components = {
  p: ({ node: _node, ...props }) => <p className="leading-relaxed [&:not(:first-child)]:mt-3" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="mt-3 list-disc space-y-1.5 pl-5 first:mt-0" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="mt-3 list-decimal space-y-1.5 pl-5 first:mt-0" {...props} />,
  li: ({ node: _node, ...props }) => <li className="leading-relaxed marker:text-muted-foreground" {...props} />,
  h1: ({ node: _node, ...props }) => <p className="mt-4 font-semibold tracking-tight first:mt-0" {...props} />,
  h2: ({ node: _node, ...props }) => <p className="mt-4 font-semibold tracking-tight first:mt-0" {...props} />,
  h3: ({ node: _node, ...props }) => <p className="mt-4 font-semibold first:mt-0" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a className="font-medium text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  code: ({ node: _node, ...props }) => <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]" {...props} />,
  pre: ({ node: _node, ...props }) => <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-3 text-sm first:mt-0" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="mt-3 border-l-2 border-border pl-3 text-muted-foreground first:mt-0" {...props} />
  ),
}

/** Markdown from the knowledge base or the model, in the app's type scale. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-[15px] text-foreground", className)}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  )
}
