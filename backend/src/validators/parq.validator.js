const { z } = require('zod');

// The 7 PARQ (Physical Activity Readiness Questionnaire) questions.
// Each key represents one yes/no medical risk question. A `true` value
// means the user answered "Yes" (potential risk).
const parqAnswersSchema = z.object({
  heartCondition: z.boolean({ message: 'heartCondition doit etre un booleen' }),
  chestPain: z.boolean({ message: 'chestPain doit etre un booleen' }),
  dizziness: z.boolean({ message: 'dizziness doit etre un booleen' }),
  jointProblems: z.boolean({ message: 'jointProblems doit etre un booleen' }),
  bloodPressureMeds: z.boolean({ message: 'bloodPressureMeds doit etre un booleen' }),
  otherMedicalReason: z.boolean({ message: 'otherMedicalReason doit etre un booleen' }),
  pregnancy: z.boolean({ message: 'pregnancy doit etre un booleen' }),
});

const submitQuestionnaireSchema = z.object({
  answers: parqAnswersSchema,
});

module.exports = { submitQuestionnaireSchema, parqAnswersSchema };
