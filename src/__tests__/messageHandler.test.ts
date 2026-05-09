import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleWebviewMessage,
  WebviewMessage,
} from "../properties/messageHandler";
import {
  handleEditMessage,
  handleRemoveAttribute,
  handleAddAttribute,
  handleExpressionEdit,
} from "../properties/editHandler";
import { NodeIdentityTracker } from "../properties/nodeIdentity";
import { makeNode } from "./helpers/makeNode";

vi.mock("../properties/editHandler", () => ({
  handleEditMessage: vi.fn(),
  handleRemoveAttribute: vi.fn(),
  handleAddAttribute: vi.fn(),
  handleExpressionEdit: vi.fn(),
}));

vi.mock("../properties/nodeIdentity", () => {
  const NodeIdentityTracker = vi.fn();
  NodeIdentityTracker.prototype.findCurrentNode = vi.fn();
  return { NodeIdentityTracker };
});

const mockHandleEditMessage = vi.mocked(handleEditMessage);
const mockHandleRemoveAttribute = vi.mocked(handleRemoveAttribute);
const mockHandleAddAttribute = vi.mocked(handleAddAttribute);
const mockHandleExpressionEdit = vi.mocked(handleExpressionEdit);

describe("handleWebviewMessage", () => {
  let tracker: NodeIdentityTracker;
  let onRefresh: ReturnType<typeof vi.fn>;
  let setEditInProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new NodeIdentityTracker();
    onRefresh = vi.fn();
    setEditInProgress = vi.fn();
  });

  function deps() {
    return { tracker, onRefresh, setEditInProgress };
  }

  // ── edit ──

  describe("edit message", () => {
    const editMsg: WebviewMessage = {
      type: "edit",
      attribute: "name",
      value: "newId",
      attributePosition: {
        nameStart: 10,
        nameEnd: 14,
        valueStart: 16,
        valueEnd: 20,
      },
    };

    it("calls handleEditMessage and refreshes on success", async () => {
      mockHandleEditMessage.mockResolvedValue(true);
      await handleWebviewMessage(editMsg, deps());

      expect(setEditInProgress).toHaveBeenCalledWith(true);
      expect(handleEditMessage).toHaveBeenCalledWith(editMsg);
      expect(onRefresh).toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("does not refresh when handleEditMessage returns false", async () => {
      mockHandleEditMessage.mockResolvedValue(false);
      await handleWebviewMessage(editMsg, deps());

      expect(onRefresh).not.toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("resets editInProgress even when handler throws", async () => {
      mockHandleEditMessage.mockRejectedValue(new Error("fail"));
      await expect(handleWebviewMessage(editMsg, deps())).rejects.toThrow(
        "fail",
      );

      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });
  });

  // ── removeAttribute ──

  describe("removeAttribute message", () => {
    const removeMsg: WebviewMessage = {
      type: "removeAttribute",
      attribute: "width",
      attributePosition: {
        nameStart: 5,
        nameEnd: 10,
        valueStart: 12,
        valueEnd: 15,
      },
    };

    it("calls handleRemoveAttribute and refreshes on success", async () => {
      mockHandleRemoveAttribute.mockResolvedValue(true);
      await handleWebviewMessage(removeMsg, deps());

      expect(setEditInProgress).toHaveBeenCalledWith(true);
      expect(handleRemoveAttribute).toHaveBeenCalledWith(removeMsg);
      expect(onRefresh).toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("does not refresh when handleRemoveAttribute returns false", async () => {
      mockHandleRemoveAttribute.mockResolvedValue(false);
      await handleWebviewMessage(removeMsg, deps());

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("resets editInProgress even when handler throws", async () => {
      mockHandleRemoveAttribute.mockRejectedValue(new Error("fail"));
      await expect(handleWebviewMessage(removeMsg, deps())).rejects.toThrow(
        "fail",
      );

      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });
  });

  // ── addAttribute ──

  describe("addAttribute message", () => {
    const addMsg: WebviewMessage = {
      type: "addAttribute",
      attribute: "height",
      value: "100",
    };

    it("calls handleAddAttribute and refreshes when node exists and succeeds", async () => {
      const node = makeNode();
      vi.mocked(tracker.findCurrentNode).mockReturnValue(node);
      mockHandleAddAttribute.mockResolvedValue(true);

      await handleWebviewMessage(addMsg, deps());

      expect(setEditInProgress).toHaveBeenCalledWith(true);
      expect(handleAddAttribute).toHaveBeenCalledWith(node, "height", "100");
      expect(onRefresh).toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("does not refresh when handleAddAttribute returns false", async () => {
      vi.mocked(tracker.findCurrentNode).mockReturnValue(makeNode());
      mockHandleAddAttribute.mockResolvedValue(false);

      await handleWebviewMessage(addMsg, deps());

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("skips handler when no current node", async () => {
      vi.mocked(tracker.findCurrentNode).mockReturnValue(null);
      await handleWebviewMessage(addMsg, deps());

      expect(handleAddAttribute).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("resets editInProgress even when handler throws", async () => {
      vi.mocked(tracker.findCurrentNode).mockReturnValue(makeNode());
      mockHandleAddAttribute.mockRejectedValue(new Error("fail"));

      await expect(handleWebviewMessage(addMsg, deps())).rejects.toThrow(
        "fail",
      );
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });
  });

  // ── expressionEdit ──

  describe("expressionEdit message", () => {
    const exprMsg: WebviewMessage = {
      type: "expressionEdit",
      expressionTag: "datasetParameterExpression",
      value: "$P{name}",
    };

    it("calls handleExpressionEdit and refreshes when node exists and succeeds", async () => {
      const node = makeNode();
      vi.mocked(tracker.findCurrentNode).mockReturnValue(node);
      mockHandleExpressionEdit.mockResolvedValue(true);

      await handleWebviewMessage(exprMsg, deps());

      expect(setEditInProgress).toHaveBeenCalledWith(true);
      expect(handleExpressionEdit).toHaveBeenCalledWith(
        node,
        "datasetParameterExpression",
        "$P{name}",
      );
      expect(onRefresh).toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("does not refresh when handleExpressionEdit returns false", async () => {
      vi.mocked(tracker.findCurrentNode).mockReturnValue(makeNode());
      mockHandleExpressionEdit.mockResolvedValue(false);

      await handleWebviewMessage(exprMsg, deps());

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("skips handler when no current node", async () => {
      vi.mocked(tracker.findCurrentNode).mockReturnValue(null);
      await handleWebviewMessage(exprMsg, deps());

      expect(handleExpressionEdit).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });

    it("resets editInProgress even when handler throws", async () => {
      vi.mocked(tracker.findCurrentNode).mockReturnValue(makeNode());
      mockHandleExpressionEdit.mockRejectedValue(new Error("fail"));

      await expect(handleWebviewMessage(exprMsg, deps())).rejects.toThrow(
        "fail",
      );
      expect(setEditInProgress).toHaveBeenLastCalledWith(false);
    });
  });

  // ── refresh ──

  describe("refresh message", () => {
    it("calls onRefresh without setting editInProgress", async () => {
      await handleWebviewMessage({ type: "refresh" }, deps());

      expect(onRefresh).toHaveBeenCalled();
      expect(setEditInProgress).not.toHaveBeenCalled();
    });
  });
});
