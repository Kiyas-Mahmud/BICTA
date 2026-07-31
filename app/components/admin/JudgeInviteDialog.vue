<script setup lang="ts">
// useConfirm() is yes/no only (no input slot), so a judge invite — which needs
// an email address — gets its own tiny dialog rather than fighting that
// composable. Also doubles as "resend" for an already-invited (not yet
// active) judge. The actual POST is left to the parent (via the `send` event)
// so this component stays a pure view + local email-field state.
const props = defineProps<{
  open: boolean
  personName: string
  personEmail: string
  judgeStatus: string | null
  sending?: boolean
  error?: string
}>()
const emit = defineEmits<{ close: []; send: [email: string] }>()

const email = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) email.value = props.personEmail || ''
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4" @click.self="emit('close')">
        <div class="surface-raised w-full max-w-sm p-6">
          <div class="flex items-center gap-3">
            <span class="panel-glyph"><Icon name="lucide:send" /></span>
            <h2 class="console-h2">{{ judgeStatus === 'invited' ? 'Resend invite' : 'Invite to judge portal' }}</h2>
          </div>
          <p class="mt-2 text-sm text-ink-soft">
            {{ personName }} will get an email with a link to set a password and access the judge portal.
          </p>

          <div class="mt-4">
            <label class="label" for="judge-invite-email">Email</label>
            <input id="judge-invite-email" v-model="email" type="email" class="input" required maxlength="254" placeholder="judge@example.com" />
          </div>

          <p v-if="error" class="form-error mt-3" role="alert">{{ error }}</p>

          <div class="mt-5 flex flex-wrap gap-3">
            <button type="button" class="btn-primary !py-2.5" :disabled="sending || !email" @click="emit('send', email)">
              <Icon :name="sending ? 'lucide:loader-2' : 'lucide:send'" :class="{ 'animate-spin': sending }" />
              {{ sending ? 'Sending…' : 'Send invite' }}
            </button>
            <button type="button" class="btn-ghost" @click="emit('close')">Cancel</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
