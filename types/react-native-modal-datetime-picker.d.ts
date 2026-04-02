declare module "react-native-modal-datetime-picker" {
  import type { ComponentType } from "react";

  export interface DateTimePickerModalProps {
    isVisible: boolean;
    mode?: "date" | "time" | "datetime";
    display?: "default" | "spinner" | "calendar" | "clock";
    locale?: string;
    minimumDate?: Date;
    maximumDate?: Date;
    is24Hour?: boolean;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
  }

  const DateTimePickerModal: ComponentType<DateTimePickerModalProps>;
  export default DateTimePickerModal;
}
