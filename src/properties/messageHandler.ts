import {
  handleEditMessage,
  EditMessage,
  handleExpressionEdit,
  ExpressionEditMessage,
  handleRemoveAttribute,
  RemoveAttributeMessage,
  handleAddAttribute,
  AddAttributeMessage,
} from "./editHandler";
import { ExpressionEditorProvider } from "./expressionEditorProvider";
import { NodeIdentityTracker } from "./nodeIdentity";

export interface OpenInEditorMessage {
  type: "openInEditor";
  expressionTag: string;
}

export type WebviewMessage =
  | EditMessage
  | ExpressionEditMessage
  | RemoveAttributeMessage
  | AddAttributeMessage
  | OpenInEditorMessage
  | { type: "refresh" };

interface MessageHandlerDeps {
  tracker: NodeIdentityTracker;
  onRefresh: () => void;
  setEditInProgress: (value: boolean) => void;
  expressionEditorProvider?: ExpressionEditorProvider;
}

export async function handleWebviewMessage(
  message: WebviewMessage,
  deps: MessageHandlerDeps,
): Promise<void> {
  const { tracker, onRefresh, setEditInProgress } = deps;

  if (message.type === "edit") {
    setEditInProgress(true);
    try {
      const success = await handleEditMessage(message);
      if (success) onRefresh();
    } finally {
      setEditInProgress(false);
    }
  } else if (message.type === "removeAttribute") {
    setEditInProgress(true);
    try {
      const success = await handleRemoveAttribute(message);
      if (success) onRefresh();
    } finally {
      setEditInProgress(false);
    }
  } else if (message.type === "addAttribute") {
    setEditInProgress(true);
    try {
      const node = tracker.findCurrentNode();
      if (node) {
        const success = await handleAddAttribute(
          node,
          message.attribute,
          message.value,
        );
        if (success) onRefresh();
      }
    } finally {
      setEditInProgress(false);
    }
  } else if (message.type === "expressionEdit") {
    setEditInProgress(true);
    try {
      const node = tracker.findCurrentNode();
      if (node) {
        const success = await handleExpressionEdit(
          node,
          message.expressionTag,
          message.value,
        );
        if (success) onRefresh();
      }
    } finally {
      setEditInProgress(false);
    }
  } else if (message.type === "refresh") {
    onRefresh();
  } else if (message.type === "openInEditor") {
    const identity = tracker.current;
    if (identity && deps.expressionEditorProvider) {
      await deps.expressionEditorProvider.openExpression(
        identity,
        message.expressionTag,
      );
    }
  }
}
