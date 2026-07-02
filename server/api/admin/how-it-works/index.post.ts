import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { howItWorksSchema } from '../../../utils/validation'

export default createHandler(schema.howItWorksSteps, howItWorksSchema)
