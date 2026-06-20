import { listHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default listHandler(schema.sponsors, schema.sponsors.sortOrder)
