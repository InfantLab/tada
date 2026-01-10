// Health check endpoint for Docker/load balancers
export default defineEventHandler(() => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
})
