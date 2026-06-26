<script setup lang="ts">
useSeoMeta({ title: 'Sign In' })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <div class="w-full max-w-sm rounded-2xl bg-white/70 backdrop-blur-xl p-8 shadow-xl border border-line">
      <div class="flex flex-col items-center gap-2 mb-6">
        <div class="mb-2">
          <p class="text-3xl font-extrabold tracking-tight">BICTA<span class="text-brand-600">.</span></p>
        </div>
        <div class="text-center">
          <h1 class="text-xl font-bold text-ink">Welcome back</h1>
          <p class="mt-1 text-sm text-ink-soft">Sign in to track all your events.</p>
        </div>
      </div>

      <form class="space-y-5">
        <div class="space-y-4">
          <div class="space-y-2">
            <UiLabel for="email">Email</UiLabel>
            <UiInput id="email" placeholder="hi@yourcompany.com" type="email" required />
          </div>
          <div class="space-y-2">
            <UiLabel for="password">Password</UiLabel>
            <UiInput id="password" placeholder="Enter your password" type="password" required />
          </div>
        </div>
        
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="remember" class="rounded border-line text-brand-600 focus:ring-brand-600" />
            <UiLabel for="remember" class="font-normal text-ink-soft">Remember me</UiLabel>
          </div>
          <a class="text-sm font-medium text-brand-600 hover:underline" href="#">Forgot password?</a>
        </div>
        
        <UiButton type="submit" class="w-full">Sign in</UiButton>
      </form>
    </div>
  </div>
</template>
