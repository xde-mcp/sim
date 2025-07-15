export async function register() {
  console.log('[Main Instrumentation] register() called, environment:', {
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    NODE_ENV: process.env.NODE_ENV,
    isServer: typeof window === 'undefined',
  })

  // Load server instrumentation if we're on the server
  if (typeof window === 'undefined') {
    console.log('[Main Instrumentation] Loading server instrumentation...')
    const serverInstrumentation = await import('./instrumentation-server')
    if (serverInstrumentation.register) {
      console.log('[Main Instrumentation] Calling server register()...')
      await serverInstrumentation.register()
    }
  }

  // Load client instrumentation if we're on the client
  if (typeof window !== 'undefined') {
    console.log('[Main Instrumentation] Loading client instrumentation...')
    await import('./instrumentation-client')
  }
}
