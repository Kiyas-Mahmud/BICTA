import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { judgingCriterionSchema } from '../../../utils/validation'

export default createHandler(schema.judgingCriteria, judgingCriterionSchema)
