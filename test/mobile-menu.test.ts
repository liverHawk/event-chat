import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { app, createTestEnv, loginAsDiscordUser } from './env-helper.ts'

const parseTopLevelRules = (css: string): Map<string, string> => {
  const rules = new Map<string, string>()
  let depth = 0
  let selStart = 0
  let bodyStart = 0
  let selector = ''
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      if (depth === 0) {
        selector = css.slice(selStart, i).trim()
        bodyStart = i + 1
      }
      depth++
    } else if (ch === '}') {
      depth--
      assert.ok(depth >= 0, 'CSS内の閉じ波括弧が過剰です')
      if (depth === 0) {
        rules.set(selector, css.slice(bodyStart, i).trim())
        selStart = i + 1
      }
    }
  }
  assert.equal(depth, 0, 'CSS内の波括弧が閉じていません')
  return rules
}

describe('モバイルメニューのCSS構文とHTMLマークアップ', () => {
  it('/styles.css の波括弧バランスが正しく、820px以下のモバイルメニュー規則が独立している', async () => {
    const { env } = createTestEnv()
    const res = await app.fetch(new Request('http://localhost/styles.css'), env)
    assert.equal(res.status, 200)
    const css = await res.text()

    const topRules = parseTopLevelRules(css)
    const mediaBody = topRules.get('@media (max-width: 820px)')
    assert.ok(mediaBody, '@media (max-width: 820px) ブロックが存在すること')

    const mobileRules = parseTopLevelRules(mediaBody)
    assert.ok(mobileRules.get('.chat-sidebar')?.includes('position: fixed'))
    assert.ok(mobileRules.get('.chat-sidebar.is-open')?.includes('transform: translateX(0)'))
    assert.ok(mobileRules.get('.sidebar-backdrop.is-open')?.includes('display: block'))
    assert.ok(mobileRules.get('.mobile-menu-btn')?.includes('display: inline-flex'))
    assert.ok(mobileRules.get('.sidebar-close-btn')?.includes('display: inline-flex'))
    assert.ok(mobileRules.get('.emoji-modal-sheet')?.includes('max-width: 100%'))
    assert.ok(mobileRules.get('.emoji-grid')?.includes('repeat(7, minmax(0, 1fr))'))
  })

  it('/rooms/global のHTMLにメニューボタン・ドロワー・閉じる導線・キャッシュバスティングCSSがある', async () => {
    const { env } = createTestEnv()
    const cookie = await loginAsDiscordUser(env, {
      id: 'mobile-test-u1',
      username: 'mobileuser',
      global_name: 'モバイル確認',
      avatar: null,
    })

    const res = await app.fetch(
      new Request('http://localhost/rooms/global', { headers: { Cookie: cookie } }),
      env,
    )
    assert.equal(res.status, 200)
    const html = await res.text()

    assert.ok(html.startsWith('<!DOCTYPE html>'))
    assert.match(html, /href="\/styles\.css\?v=[0-9a-f]+"/)
    assert.match(
      html,
      /<button[^>]*class="mobile-menu-btn"[^>]*aria-controls="chat-sidebar"[^>]*aria-expanded="false"[^>]*data-action="open-sidebar"[^>]*>\s*<svg[\s\S]*<\/svg>\s*<\/button>/,
    )
    assert.ok(html.includes('id="chat-sidebar"'))
    assert.ok(html.includes('id="sidebar-backdrop"'))
    assert.match(html, /class="sidebar-close-btn"[^>]*data-action="close-sidebar"/)
    assert.ok(html.includes("a==='open-sidebar'"))
    assert.ok(html.includes("a==='close-sidebar'"))
    assert.ok(html.includes("setAttribute('aria-expanded'"))
  })
})
