import { Button, ButtonProps } from './Button'

interface Props
  extends Pick<ButtonProps, 'isLoading' | 'onClick' | 'isDisabled'> {
  text?: string
}

export const SubmitFormButton = ({ text = 'Submit', ...props }: Props) => {
  return (
    <Button kind="reversed" size="l" {...props}>
      {text}
    </Button>
  )
}
