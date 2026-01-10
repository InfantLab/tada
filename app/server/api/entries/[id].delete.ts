import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '~/server/db'
import { entries } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const userId = 'default-user' // TODO: Get from auth context once Lucia is implemented
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Entry ID is required',
      })
    }
    
    // Check if entry exists and belongs to user
    const [existing] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .limit(1)
    
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Entry not found',
      })
    }
    
    // Soft delete by setting deletedAt
    await db
      .update(entries)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    
    return { success: true, id }
  } catch (error: any) {
    console.error('Failed to delete entry:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete entry',
      data: { error: error.message },
    })
  }
})
