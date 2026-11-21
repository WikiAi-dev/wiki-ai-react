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

  it("renders http(s) images, as the document viewer needs", () => {
    const html = render("![](https://example.com/storage/a.png)")
    expect(html).toContain('<img src="https://example.com/storage/a.png"')
    expect(html).toMatch(/referrerpolicy="no-referrer"/i)
  })

  it("does not render images with other protocols", () => {
    const html = render("![pixel](data:image/gif;base64,R0lGOD) ![rel](/a.png)")
    expect(html).not.toMatch(/<img/i)
    expect(html).toContain("pixel")
    expect(html).toContain("rel")
  })
})
