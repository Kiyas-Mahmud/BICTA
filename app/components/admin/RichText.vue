<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const model = defineModel<string>({ default: '' })

const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose-edit min-h-[11rem] px-4 py-3 text-sm focus:outline-none',
    },
  },
  onUpdate({ editor }) {
    model.value = editor.getHTML()
  },
})

watch(model, (v) => {
  if (editor.value && v !== editor.value.getHTML()) {
    editor.value.commands.setContent(v, { emitUpdate: false })
  }
})

onBeforeUnmount(() => editor.value?.destroy())

function setLink() {
  if (!editor.value) return
  const prev = editor.value.getAttributes('link').href as string | undefined
  const url = window.prompt('Link URL (https://…)', prev ?? 'https://')
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  if (!/^https?:\/\//.test(url)) return
  editor.value.chain().focus().setLink({ href: url }).run()
}

// Grouped so related controls sit together with a divider between groups.
const groups = computed(() => {
  const e = editor.value
  if (!e) return []
  return [
    [
      { icon: 'lucide:bold', title: 'Bold', active: e.isActive('bold'), run: () => e.chain().focus().toggleBold().run() },
      { icon: 'lucide:italic', title: 'Italic', active: e.isActive('italic'), run: () => e.chain().focus().toggleItalic().run() },
    ],
    [
      { icon: 'lucide:heading-2', title: 'Heading 2', active: e.isActive('heading', { level: 2 }), run: () => e.chain().focus().toggleHeading({ level: 2 }).run() },
      { icon: 'lucide:heading-3', title: 'Heading 3', active: e.isActive('heading', { level: 3 }), run: () => e.chain().focus().toggleHeading({ level: 3 }).run() },
    ],
    [
      { icon: 'lucide:list', title: 'Bullet list', active: e.isActive('bulletList'), run: () => e.chain().focus().toggleBulletList().run() },
      { icon: 'lucide:list-ordered', title: 'Numbered list', active: e.isActive('orderedList'), run: () => e.chain().focus().toggleOrderedList().run() },
      { icon: 'lucide:quote', title: 'Quote', active: e.isActive('blockquote'), run: () => e.chain().focus().toggleBlockquote().run() },
    ],
    [
      { icon: 'lucide:link', title: 'Link', active: e.isActive('link'), run: setLink },
      { icon: 'lucide:undo-2', title: 'Undo', active: false, run: () => e.chain().focus().undo().run() },
      { icon: 'lucide:redo-2', title: 'Redo', active: false, run: () => e.chain().focus().redo().run() },
    ],
  ]
})

const words = computed(() => {
  const text = editor.value?.getText()?.trim() ?? ''
  return text ? text.split(/\s+/).length : 0
})
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-line bg-white transition-shadow focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
    <div class="flex flex-wrap items-center gap-1 border-b border-line bg-mist-1 p-1.5" role="toolbar" aria-label="Text formatting">
      <template v-for="(group, gi) in groups" :key="gi">
        <span v-if="gi" class="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
        <button
          v-for="btn in group"
          :key="btn.title"
          type="button"
          :title="btn.title"
          :aria-label="btn.title"
          :aria-pressed="btn.active"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-white hover:text-ink"
          :class="{ 'bg-brand-100 !text-brand-800': btn.active }"
          @click="btn.run"
        >
          <Icon :name="btn.icon" class="text-base" />
        </button>
      </template>
    </div>

    <EditorContent :editor="editor" />

    <div class="flex items-center justify-between border-t border-line bg-mist-1 px-3 py-1.5 text-[0.65rem] font-semibold text-ink-faint">
      <span>Rich text — sanitised on save</span>
      <span>{{ words }} word{{ words === 1 ? '' : 's' }}</span>
    </div>
  </div>
</template>

<style scoped>
:deep(.prose-edit h2) { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0 0.25rem; }
:deep(.prose-edit h3) { font-size: 1.1rem; font-weight: 600; margin: 0.6rem 0 0.2rem; }
:deep(.prose-edit ul) { list-style: disc; padding-left: 1.25rem; }
:deep(.prose-edit ol) { list-style: decimal; padding-left: 1.25rem; }
:deep(.prose-edit blockquote) { border-left: 3px solid #d3ddca; padding-left: 0.75rem; color: #586158; }
:deep(.prose-edit a) { color: #5e6f54; text-decoration: underline; }
:deep(.prose-edit p) { margin: 0.25rem 0; }
:deep(.prose-edit p.is-editor-empty:first-child::before) { color: #98a29a; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
</style>
