import { useEffect, useRef, useState } from 'react'
import { Annotation, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const externalUpdate = Annotation.define<boolean>()

export function useMarkdownSource(value: string, onChange: (value: string) => void) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const changeRef = useRef(onChange)
  const initialValue = useRef(value)
  const anchors = useRef(new Map<symbol, number>())
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })
  changeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          markdown({ base: markdownLanguage }), history(), drawSelection(), EditorView.lineWrapping,
          syntaxHighlighting(HighlightStyle.define([
            { tag: tags.heading, color: 'hsl(var(--primary))', fontWeight: '600' },
            { tag: tags.strong, fontWeight: 'bold' },
            { tag: tags.emphasis, fontStyle: 'italic' },
            { tag: [tags.link, tags.url], color: 'hsl(var(--primary))', textDecoration: 'underline' },
            { tag: [tags.comment, tags.meta], color: 'hsl(var(--muted-foreground))' },
            { tag: [tags.keyword, tags.string], color: 'hsl(var(--primary))' },
          ])),
          keymap.of([
            { key: 'Mod-b', run: () => { wrap('**'); return true } },
            { key: 'Mod-i', run: () => { wrap('*'); return true } },
            ...defaultKeymap, ...historyKeymap, indentWithTab,
          ]),
          placeholder('开始写作…支持 Markdown，也可以粘贴或拖入图片'),
          EditorView.contentAttributes.of({ 'aria-label': 'Markdown 原文', spellcheck: 'true' }),
          EditorView.theme({
            '&': { backgroundColor: 'transparent', color: 'hsl(var(--foreground))', fontSize: 'inherit' },
            '&.cm-focused': { outline: 'none' },
            '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.85', overflow: 'auto' },
            '.cm-content': { minHeight: '60vh', padding: '0', caretColor: 'hsl(var(--foreground))' },
            '.cm-line': { padding: '0' },
            '.cm-cursor': { borderLeftColor: 'hsl(var(--foreground))' },
            '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'hsl(var(--primary) / 0.18)' },
            '.cm-placeholder': { color: 'hsl(var(--muted-foreground))' },
          }),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              for (const [key, position] of anchors.current) anchors.current.set(key, update.changes.mapPos(position, 1))
              if (!update.transactions.some(transaction => transaction.annotation(externalUpdate))) {
                changeRef.current(update.state.doc.toString())
              }
            }
            if (update.docChanged) setHistoryState({ canUndo: undoDepth(update.state) > 0, canRedo: redoDepth(update.state) > 0 })
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      anchors.current.clear()
      viewRef.current = null
      view.destroy()
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value }, annotations: externalUpdate.of(true) })
  }, [value])

  function insert(text: string) {
    const view = viewRef.current
    if (!view) return
    view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true })
    view.focus()
  }

  function wrap(before: string, after = before, fallback = '文字') {
    const view = viewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const text = view.state.sliceDoc(from, to) || fallback
    view.dispatch({ changes: { from, to, insert: before + text + after }, selection: { anchor: from + before.length, head: from + before.length + text.length }, scrollIntoView: true })
    view.focus()
  }

  function prefix(marker: string) {
    const view = viewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const first = view.state.doc.lineAt(from)
    const last = view.state.doc.lineAt(to > from && view.state.doc.lineAt(to).from === to ? to - 1 : to)
    const changes = []
    for (let n = first.number; n <= last.number; n++) changes.push({ from: view.state.doc.line(n).from, insert: marker })
    view.dispatch({ changes, scrollIntoView: true })
    view.focus()
  }

  // Positions follow intervening edits, so an upload never replaces a later selection.
  function anchor() {
    const key = Symbol('media insertion')
    const view = viewRef.current
    if (view) anchors.current.set(key, view.state.selection.main.head)
    return (text?: string) => {
      const position = anchors.current.get(key)
      anchors.current.delete(key)
      const current = viewRef.current
      if (!current || position === undefined || text === undefined) return
      current.dispatch({ changes: { from: position, insert: `\n\n${text}\n\n` } })
    }
  }

  return { hostRef, insert, wrap, prefix, anchor, ...historyState,
    undo: () => { if (viewRef.current) { undo(viewRef.current); viewRef.current.focus() } },
    redo: () => { if (viewRef.current) { redo(viewRef.current); viewRef.current.focus() } },
  }
}
