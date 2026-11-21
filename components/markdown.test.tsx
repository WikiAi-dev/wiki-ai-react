import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Markdown } from "./markdown"

const render = (md: string) => renderToStaticMarkup(createElement(Markdown, null, md))

describe("Markdown (untrusted knowledge-base and model text)", () => {
  it("does not render raw HTML (E9)", () => {
    const html = render('<script>alert(1)</script><img src=x onerror=alert(1)><b onclick="x()">bold</b>')
    // Shown as escaped text, never as elements.
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/<b[\s>]/i)
    expect(html).toContain("&lt;script&gt;")
  })

  it("drops javascript: links (E9)", () => {
    const html = render("[click](javascript:alert(1))")
    expect(html).not.toMatch(/javascript:/i)
  })

  it("keeps https links and opens them safely", () => {
    const html = render("[docs](https://example.com/a)")
    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })

  it("does not load remote images (E14)", () => {
    const html = render("![pixel](https://tracker.example/p.gif)")
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toContain("tracker.example")
    expect(html).toContain("pixel")
  })
})
