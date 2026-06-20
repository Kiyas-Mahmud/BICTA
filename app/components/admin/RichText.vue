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
      class: 'prose-edit min-h-[160px] px-3.5 py-2.5 text-sm focus:outline-none',
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

const buttons = computed(() => {
  const e = editor.value
  if (!e) return []
  return [
    { icon: 'lucide:bold', title: 'Bold', active: e.isActive('bold'), run: () => e.chain().focus().toggleBold().run() },
    { icon: 'lucide:italic', title: 'Italic', active: e.isActive('italic'), run: () => e.chain().focus().toggleItalic().run() },
    { icon: 'lucide:heading-2', title: 'Heading 2', active: e.isActive('heading', { level: 2 }), run: () => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'lucide:heading-3', title: 'Heading 3', active: e.isActive('heading', { level: 3 }), run: () => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: 'lucide:list', title: 'Bullet list', active: e.isActive('bulletList'), run: () => e.chain().focus().toggleBulletList().run() },
    { icon: 'lucide:list-ordered', title: 'Numbered list', active: e.isActive('orderedList'), run: () => e.chain().focus().toggleOrderedList().run() },
    { icon: 'lucide:quote', title: 'Quote', active: e.isActive('blockquote'), run: () => e.chain().focus().toggleBlockquote().run() },
    { icon: 'lucide:link', title: 'Link', active: e.isActive('link'), run: setLink },
  ]
})
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-line bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
    <div class="flex flex-wrap gap-1 border-b border-line bg-neutral-50 p-1.5">
      <button
        v-for="btn in buttons"
        :key="btn.title"
        type="button"
        :title="btn.title"
        :aria-label="btn.title"
        class="flex h-8 w-8 items-center justify-center rounded text-ink-soft transition-colors hover:bg-neutral-200"
        :class="{ 'bg-neutral-200 !text-ink': btn.active }"
        @click="btn.run"
      >
        <Icon :name="btn.icon" class="text-base" />
      </button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
:deep(.prose-edit h2) { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0 0.25rem; }
:deep(.prose-edit h3) { font-size: 1.1rem; font-weight: 600; margin: 0.6rem 0 0.2rem; }
:deep(.prose-edit ul) { list-style: disc; padding-left: 1.25rem; }
:deep(.prose-edit ol) { list-style: decimal; padding-left: 1.25rem; }
:deep(.prose-edit blockquote) { border-left: 3px solid #e5e5e5; padding-left: 0.75rem; color: #525252; }
:deep(.prose-edit a) { color: #2563eb; text-decoration: underline; }
:deep(.prose-edit p) { margin: 0.25rem 0; }
</style>
