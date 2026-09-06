import { createAlertDialog } from "@gluestack-ui/core/alert-dialog/creator";
import { View, Pressable } from "react-native";

const UIAlertDialog = createAlertDialog({
  Root: View,
  Backdrop: Pressable,
  Content: View,
  Header: View,
  Body: View,
  Footer: View,
  CloseButton: Pressable,
});

const AlertDialog = UIAlertDialog;
const AlertDialogBackdrop = UIAlertDialog.Backdrop;
const AlertDialogContent = UIAlertDialog.Content;
const AlertDialogHeader = UIAlertDialog.Header;
const AlertDialogBody = UIAlertDialog.Body;
const AlertDialogFooter = UIAlertDialog.Footer;
const AlertDialogCloseButton = UIAlertDialog.CloseButton;

export { AlertDialog, AlertDialogBackdrop, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, AlertDialogCloseButton };
