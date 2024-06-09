import { Language } from '@demo/languages/Language'
import { toBatches } from '@lib/utils/array/toBatches'
import { TranslationServiceClient } from '@google-cloud/translate'
import { getEnvVar } from '../getEnvVar'
import { extractTemplateVariables } from '@lib/utils/template/extractTemplateVariables'
import { withoutDuplicates } from '@lib/utils/array/withoutDuplicates'
import { injectVariables } from '@lib/utils/template/injectVariables'
import { makeRecord } from '@lib/utils/record/makeRecord'
import { toTemplateVariable } from '@lib/utils/template/toTemplateVariable'

const batchSize = 600

interface TranslateTextsParams {
  texts: string[]
  from: Language
  to: Language
}

export const translateTexts = async ({
  texts,
  from,
  to,
}: TranslateTextsParams): Promise<string[]> => {
  if (texts.length === 0) {
    return []
  }

  const variables = withoutDuplicates(
    texts.map(extractTemplateVariables).flat(),
  )

  const translationClient = new TranslationServiceClient()

  const batches = toBatches(texts, batchSize)

  const result = []
  for (const batch of batches) {
    const contents = batch.map((text) =>
      injectVariables(
        text,
        makeRecord(extractTemplateVariables(text), (text) =>
          toTemplateVariable(`var_${variables.indexOf(text)}`),
        ),
      ),
    )

    const request = {
      parent: `projects/${getEnvVar(
        'GOOGLE_TRANSLATE_PROJECT_ID',
      )}/locations/global`,
      contents,
      mimeType: 'text/plain',
      sourceLanguageCode: from,
      targetLanguageCode: to,
    }

    const [{ translations }] = await translationClient.translateText(request)
    if (!translations) {
      throw new Error('No translations')
    }

    result.push(
      ...translations.map((translation) => {
        const { translatedText } = translation
        if (!translatedText) {
          throw new Error('No translatedText')
        }

        return injectVariables(
          translatedText,
          makeRecord(extractTemplateVariables(translatedText), (variable) =>
            toTemplateVariable(variables[Number(variable.split('_')[1])]),
          ),
        )
      }),
    )
  }

  return result
}
