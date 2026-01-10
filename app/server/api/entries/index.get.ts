import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '~/server/db'
import { entries } from '~/server/db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = 'default-user' // TODO: Get from auth context once Lucia is implemented
    
    // Build where conditions
    const conditions = [
      eq(entries.userId, userId),
      isNull(entries.deletedAt), // Exclude soft-deleted entries
    ]
    
    // Filter by type if provided
    if (query.type && typeof query.type === 'string') {
      conditions.push(eq(entries.type, query.type))
    }
    
    // Query entries
    const userEntries = await db
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.timestamp))
      .limit(query.limit ? parseInt(query.limit as string) : 100)
    
    return userEntries
  } catch (error: any) {
    console.error('Failed to fetch entries:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch entries',
      data: { error: error.message },
    })
  }
})
