import { createModal } from "@gluestack-ui/core/modal/creator";
import { View, Pressable } from "react-native";

const UIModal = createModal({
  Root: View,
  Backdrop: Pressable,
  Content: View,
  Header: View,
  Body: View,
  Footer: View,
  CloseButton: Pressable,
});

const Modal = UIModal;
const ModalBackdrop = UIModal.Backdrop;
const ModalContent = UIModal.Content;
const ModalHeader = UIModal.Header;
const ModalBody = UIModal.Body;
const ModalFooter = UIModal.Footer;
const ModalCloseButton = UIModal.CloseButton;

export { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton };
