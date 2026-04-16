import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  alpha,
  useTheme,
  TextField,
  Divider,
  Badge,
  CircularProgress,
  Chip,
  Alert,
} from "@mui/material";
import {
  Add,
  Inbox,
  Send,
  Star,
  StarBorder,
  Delete,
  Search,
  Reply,
} from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FormModal } from "@/components/ui/FormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { FormField } from "@/components/ui/FormModal";
import { useAuthStore } from "@/stores/authStore";
import { queryKeys } from "@/lib/queryKeys";
import {
  useInbox,
  useSentMessages,
  useSendMessage,
  useDeleteMessage,
} from "@/hooks/messages/useMessages";
import {
  messageService,
  type MessageRecipient,
} from "@/services/messageService";

interface MessageItem {
  id: string;
  sender: string;
  senderRole?: string;
  senderId?: string;
  recipient?: string;
  recipientId?: string;
  recipients?: Array<{ id: string; name: string; role: string }>;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent";
  content: string;
  category?: string;
}

interface MessageApiParticipant {
  id?: string;
  _id?: string;
  name?: string;
  role?: string;
}

interface MessageApiRecord {
  id?: string;
  _id?: string;
  senderName?: string;
  senderRole?: string;
  senderId?: string;
  sender?: {
    name?: string;
    role?: string;
  };
  recipientName?: string;
  recipientId?: string;
  recipients?: MessageApiParticipant[];
  subject?: string;
  content?: string;
  createdAt: string;
  isRead?: boolean;
  isStarred?: boolean;
  category?: string;
}

interface MessageListResponse {
  data?: MessageApiRecord[];
}

interface RecipientListResponse {
  data?: MessageRecipient[];
}

interface MessageMutationResponse {
  data?: MessageApiRecord;
}

const markMessageRecordAsRead = (entry: unknown, messageId: string) => {
  if (!entry || typeof entry !== "object") {
    return entry;
  }

  const record = entry as MessageListResponse & { [key: string]: unknown };
  if (!Array.isArray(record.data)) {
    return entry;
  }

  return {
    ...record,
    data: record.data.map((message) =>
      getMessageId(message) === messageId
        ? { ...message, isRead: true }
        : message,
    ),
  };
};

const getMessageId = (message: MessageApiRecord) => message.id || message._id || "";

const getParticipantId = (participant: MessageApiParticipant) =>
  participant.id || participant._id || "";

const CATEGORY_OPTIONS = [
  { value: "General", label: "General" },
  { value: "Academic", label: "Academic" },
  { value: "Attendance", label: "Attendance" },
  { value: "Emergency", label: "Emergency" },
  { value: "Announcement", label: "Announcement" },
  { value: "Reminder", label: "Reminder" },
];

const getRecipientGroupLabel = (recipient: MessageRecipient) => {
  const roleLabel =
    recipient.role === "SchoolAdmin"
      ? "School Admin"
      : recipient.role === "SystemAdmin"
        ? "System Admin"
        : recipient.role || "Other";
  return recipient.relationship
    ? `${roleLabel} - ${recipient.relationship}`
    : roleLabel;
};

export function MessagesPage() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "starred">(
    "inbox",
  );
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(
    null,
  );
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [composeValues, setComposeValues] = useState<Record<string, unknown>>({
    recipientSearch: "",
    recipientId: "",
    category: "General",
    subject: "",
    content: "",
  });
  const [composeFormKey, setComposeFormKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const { data: inboxData, isLoading: isLoadingInbox } = useInbox();
  const { data: sentData, isLoading: isLoadingSent } = useSentMessages();
  const {
    data: recipientsData,
    isLoading: isLoadingRecipients,
    error: recipientsError,
  } = useQuery<RecipientListResponse>({
    queryKey: queryKeys.messages.recipients(userId),
    queryFn: () => messageService.getRecipients(),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();

  const recipients = useMemo(
    () => (Array.isArray(recipientsData?.data) ? recipientsData.data : []),
    [recipientsData],
  );

  const messages: MessageItem[] = useMemo(() => {
    const inboxRecords = Array.isArray((inboxData as MessageListResponse | undefined)?.data)
      ? (inboxData as MessageListResponse).data!
      : [];
    const sentRecords = Array.isArray((sentData as MessageListResponse | undefined)?.data)
      ? (sentData as MessageListResponse).data!
      : [];

    const inboxMessages: MessageItem[] = inboxRecords.map(
      (message) => {
        const messageId = getMessageId(message);

        return {
          id: messageId,
          sender: message.senderName || message.sender?.name || "Unknown",
          senderRole: message.senderRole || message.sender?.role,
          senderId: message.senderId,
          recipient: message.recipientName,
          recipientId: message.recipientId,
          recipients: (message.recipients || []).map((recipient) => ({
            id: getParticipantId(recipient),
            name: recipient.name || "Unknown",
            role: recipient.role || "",
          })),
          subject: message.subject || "(No subject)",
          preview: message.content?.substring(0, 120) || "",
          date: message.createdAt,
          read: Boolean(message.isRead),
          starred:
            starredIds[messageId] !== undefined
              ? starredIds[messageId]
              : Boolean(message.isStarred),
          folder: "inbox",
          content: message.content || "",
          category: message.category,
        };
      },
    );

    const sentMessages: MessageItem[] = sentRecords.map(
      (message) => {
        const messageId = getMessageId(message);

        return {
          id: messageId,
          sender: "You",
          senderRole: message.senderRole || "CurrentUser",
          senderId: message.senderId,
          recipient:
            message.recipientName ||
            (Array.isArray(message.recipients)
              ? message.recipients.map((recipient) => recipient.name).join(", ")
              : ""),
          recipientId: message.recipientId,
          recipients: (message.recipients || []).map((recipient) => ({
            id: getParticipantId(recipient),
            name: recipient.name || "Unknown",
            role: recipient.role || "",
          })),
          subject: message.subject || "(No subject)",
          preview: message.content?.substring(0, 120) || "",
          date: message.createdAt,
          read: true,
          starred:
            starredIds[messageId] !== undefined
              ? starredIds[messageId]
              : Boolean(message.isStarred),
          folder: "sent",
          content: message.content || "",
          category: message.category,
        };
      },
    );

    const mergedMessages = [...sentMessages, ...inboxMessages].reduce<MessageItem[]>(
      (accumulator, message) => {
        if (accumulator.some((entry) => entry.id === message.id)) {
          return accumulator;
        }

        accumulator.push({
          ...message,
          sender: message.folder === "sent" ? "You" : message.sender,
          read: message.folder === "sent" ? true : message.read,
        });

        return accumulator;
      },
      [],
    );

    return mergedMessages.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [inboxData, sentData, starredIds]);

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      if (activeTab === "starred") {
        if (!message.starred) return false;
      } else if (message.folder !== activeTab) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const term = search.trim().toLowerCase();
      return (
        message.subject.toLowerCase().includes(term) ||
        message.sender.toLowerCase().includes(term) ||
        (message.recipient || "").toLowerCase().includes(term) ||
        message.preview.toLowerCase().includes(term) ||
        (message.category || "").toLowerCase().includes(term)
      );
    });
  }, [activeTab, messages, search]);

  useEffect(() => {
    if (!filteredMessages.length) {
      setSelectedMessage(null);
      return;
    }

    setSelectedMessage((current) => {
      if (!current) return filteredMessages[0];
      return (
        filteredMessages.find((message) => message.id === current.id) ||
        filteredMessages[0]
      );
    });
  }, [filteredMessages]);

  const tabs = [
    {
      key: "inbox" as const,
      label: "Inbox",
      count: messages.filter((message) => message.folder === "inbox" && !message.read)
        .length,
    },
    {
      key: "sent" as const,
      label: "Sent",
      count: 0,
    },
    {
      key: "starred" as const,
      label: "Starred",
      count: 0,
    },
  ];

  const recipientSearchTerm = String(composeValues.recipientSearch || "")
    .trim()
    .toLowerCase();

  const filteredRecipients = useMemo(() => {
    if (!recipientSearchTerm) return recipients;

    return recipients.filter((recipient) => {
      const searchableText = [
        recipient.name,
        recipient.role,
        recipient.email,
        recipient.relationship,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(recipientSearchTerm);
    });
  }, [recipientSearchTerm, recipients]);

  const recipientOptions = filteredRecipients.map((recipient) => {
    let additionalInfo = "";

    // Add class information for students
    if (recipient.role === "Student" && recipient.grade) {
      additionalInfo = ` - Grade ${recipient.grade}`;
      if (recipient.stream) {
        additionalInfo += ` (${recipient.stream})`;
      }
    }

    // Add linked student information for parents
    if (recipient.role === "Parent" && recipient.linkedStudentInfo && recipient.linkedStudentInfo.length > 0) {
      const studentNames = recipient.linkedStudentInfo
        .map((student) => {
          let studentInfo = student.name;
          if (student.grade) {
            studentInfo += ` (Grade ${student.grade}`;
            if (student.stream) {
              studentInfo += ` ${student.stream}`;
            }
            studentInfo += ")";
          }
          return studentInfo;
        })
        .join(", ");
      additionalInfo = ` - Parent of: ${studentNames}`;
    }

    // Add subject information for teachers
    if (recipient.role === "Teacher" && recipient.subjects && recipient.subjects.length > 0) {
      additionalInfo = ` - Teaches: ${recipient.subjects.join(", ")}`;
    }

    return {
      value: recipient.id,
      label: `${recipient.name} (${recipient.role})${additionalInfo}${
        recipient.relationship && !additionalInfo ? ` - ${recipient.relationship}` : ""
      }`,
      group: getRecipientGroupLabel(recipient),
    };
  });

  const recipientsErrorMessage =
    recipientsError instanceof Error
      ? recipientsError.message
      : "Unable to load available recipients.";

  const formFields: FormField[] = [
    {
      name: "recipientSearch",
      label: "Search Recipient",
      type: "text",
      placeholder: "Search by name, role, email, or relationship...",
      helperText: "Find recipients quickly, then choose from the grouped list below.",
    },
    {
      name: "recipientId",
      label: "Recipient",
      type: "select",
      required: true,
      options: recipientOptions,
      helperText: filteredRecipients.length
        ? "Recipients are grouped by category. Only people you are allowed to message are listed here."
        : recipientSearchTerm
          ? "No recipients match your search."
          : recipients.length
        ? "Only people you are allowed to message are listed here."
        : recipientsError
          ? recipientsErrorMessage
          : "No available recipients were found for your account.",
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: CATEGORY_OPTIONS,
      helperText: "Choose the closest category for this message.",
    },
    { name: "subject", label: "Subject", type: "text", required: true },
    {
      name: "content",
      label: "Message",
      type: "textarea",
      required: true,
      rows: 6,
      placeholder: "Write your message here...",
    },
  ];

  const handleSelectMessage = async (message: MessageItem) => {
    setSelectedMessage(
      message.folder === "inbox" && !message.read
        ? { ...message, read: true }
        : message,
    );
    setReplyContent("");

    if (message.folder !== "inbox" || message.read) {
      return;
    }

    try {
      queryClient.setQueriesData(
        { queryKey: queryKeys.messages.scope(userId) },
        (existing) => markMessageRecordAsRead(existing, message.id),
      );
      await messageService.markAsRead(message.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
    } catch {
      // Keep selection responsive even if read-state sync fails.
    }
  };

  const handleStar = async (message: MessageItem) => {
    const isCurrentlyStarred = message.starred;
    setStarredIds((previous) => ({
      ...previous,
      [message.id]: !isCurrentlyStarred,
    }));

    try {
      if (isCurrentlyStarred) {
        await messageService.unstarMessage(message.id);
      } else {
        await messageService.starMessage(message.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
    } catch {
      setStarredIds((previous) => ({
        ...previous,
        [message.id]: isCurrentlyStarred,
      }));
      toast.error("Failed to update star");
    }
  };

  const handleDelete = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!messageToDelete) return;
    try {
      await deleteMessage.mutateAsync(messageToDelete);
      setSelectedMessage((current) =>
        current?.id === messageToDelete ? null : current,
      );
    } catch {
      // error handled by mutation onError
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      toast.error("Write a reply before sending.");
      return;
    }

    const replyRecipientId =
      selectedMessage.folder === "sent"
        ? selectedMessage.recipientId || selectedMessage.recipients?.[0]?.id || ""
        : selectedMessage.senderId || "";

    try {
      setIsReplying(true);
      const response = await messageService.replyMessage(
        selectedMessage.id,
        replyContent.trim(),
        selectedMessage.category,
        replyRecipientId || undefined,
      ) as MessageMutationResponse;
      const reply = response?.data;

      setReplyContent("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      setActiveTab("sent");

      if (reply) {
        const replyId = getMessageId(reply);
        const replyRecipients = (reply.recipients || []).map((recipient) => ({
          id: getParticipantId(recipient),
          name: recipient.name || "Unknown",
          role: recipient.role || "",
        }));
        const replyRecipientNames = replyRecipients.map((recipient) => recipient.name);

        setSelectedMessage({
          id: replyId,
          sender: "You",
          senderRole: reply.senderRole || "CurrentUser",
          senderId: reply.senderId,
          recipient: reply.recipientName || replyRecipientNames.join(", "),
          recipientId: reply.recipientId,
          recipients: replyRecipients,
          subject: reply.subject || "(No subject)",
          preview: reply.content?.substring(0, 120) || "",
          date: reply.createdAt,
          read: true,
          starred: Boolean(reply.isStarred),
          folder: "sent",
          content: reply.content || "",
          category: reply.category,
        });
      }

      toast.success("Reply sent successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send reply";
      toast.error(message);
    } finally {
      setIsReplying(false);
    }
  };

  const isLoading = isLoadingInbox || isLoadingSent;
  const composeDisabled =
    isLoadingRecipients || Boolean(recipientsError) || recipients.length === 0;

  const composeInitialValues = useMemo(
    () => ({
      recipientSearch: "",
      recipientId: recipients[0]?.id || "",
      category: "General",
      subject: "",
      content: "",
    }),
    [recipients],
  );

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Messages" }]} />
      <PageHeader
        title="Messages"
        subtitle="Secure messaging between students, teachers, parents, and school admins"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            disabled={composeDisabled}
            onClick={() => setFormModalOpen(true)}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            }}
          >
            Compose
          </Button>
        }
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 3,
          minHeight: 560,
        }}
      >
        <Paper sx={{ width: { xs: "100%", lg: 240 }, borderRadius: 3, p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Add />}
            disabled={composeDisabled}
            onClick={() => setFormModalOpen(true)}
            sx={{
              mb: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            }}
          >
            Compose
          </Button>
          <Divider sx={{ mb: 2 }} />
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              fullWidth
              startIcon={
                tab.key === "inbox" ? (
                  <Inbox />
                ) : tab.key === "sent" ? (
                  <Send />
                ) : (
                  <Star />
                )
              }
              onClick={() => setActiveTab(tab.key)}
              sx={{
                justifyContent: "flex-start",
                mb: 1,
                background:
                  activeTab === tab.key
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                color:
                  activeTab === tab.key
                    ? theme.palette.primary.main
                    : "text.secondary",
                "&:hover": {
                  background: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Badge
                badgeContent={tab.count}
                color="error"
                invisible={tab.key !== "inbox" || tab.count === 0}
                sx={{ mr: 1 }}
              >
                {tab.label}
              </Badge>
            </Button>
          ))}
          <Divider sx={{ my: 2 }} />
          {recipientsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {recipientsErrorMessage}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            {recipientsError
              ? "Recipients could not be loaded."
              : composeDisabled
                ? "No valid recipients are available for your account yet."
              : `${recipients.length} available contact${recipients.length === 1 ? "" : "s"} in categorized groups`}
          </Typography>
        </Paper>

        <Paper
          sx={{
            width: { xs: "100%", lg: 420 },
            borderRadius: 3,
            p: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search messages..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: (
                  <Search sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredMessages.map((message) => (
                <ListItemButton
                  key={message.id}
                  selected={selectedMessage?.id === message.id}
                  onClick={() => handleSelectMessage(message)}
                  sx={{
                    alignItems: "flex-start",
                    borderRadius: 2,
                    mb: 1,
                    background: message.read
                      ? "transparent"
                      : alpha(theme.palette.primary.main, 0.05),
                    "&.Mui-selected": {
                      background: alpha(theme.palette.primary.main, 0.14),
                    },
                    "&:hover": {
                      background: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ background: theme.palette.primary.main }}>
                      {(message.folder === "sent"
                        ? message.recipient || "Y"
                        : message.sender || "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={message.read ? 400 : 700}
                            noWrap
                          >
                            {message.subject}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {message.folder === "sent"
                              ? `To: ${message.recipient || "Unknown"}`
                              : `From: ${message.sender}`}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {message.date
                            ? new Date(message.date).toLocaleDateString()
                            : ""}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        {message.category && (
                          <Chip
                            label={message.category}
                            size="small"
                            sx={{ mb: 0.75, height: 22 }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {message.preview}
                        </Typography>
                      </Box>
                    }
                  />

                  <Box sx={{ display: "flex", ml: 1 }}>
                    <IconButton
                      onClick={() => void handleStar(message)}
                      size="small"
                      aria-label={message.starred ? "Unstar message" : "Star message"}
                    >
                      {message.starred ? (
                        <Star fontSize="small" />
                      ) : (
                        <StarBorder fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={() => void handleDelete(message.id)}
                      size="small"
                      aria-label="Delete message"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItemButton>
              ))}

              {!filteredMessages.length && (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No messages found
                </Typography>
              )}
            </List>
          )}
        </Paper>

        <Paper sx={{ flex: 1, borderRadius: 3, p: 3 }}>
          {selectedMessage ? (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedMessage.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMessage.folder === "sent"
                      ? `To ${selectedMessage.recipient || "Unknown"}`
                      : `From ${selectedMessage.sender}${
                          selectedMessage.senderRole
                            ? ` (${selectedMessage.senderRole})`
                            : ""
                        }`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedMessage.date
                      ? new Date(selectedMessage.date).toLocaleString()
                      : ""}
                  </Typography>
                </Box>
                {selectedMessage.category && (
                  <Chip label={selectedMessage.category} color="primary" variant="outlined" />
                )}
              </Box>

              {selectedMessage.recipients && selectedMessage.recipients.length > 1 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Participants:{" "}
                  {selectedMessage.recipients
                    .map((recipient) => `${recipient.name} (${recipient.role})`)
                    .join(", ")}
                </Typography>
              )}

              <Divider sx={{ mb: 2 }} />

              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap", flex: 1, minHeight: 180 }}
              >
                {selectedMessage.content}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography
                variant="subtitle2"
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                <Reply fontSize="small" />
                Reply
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={() => void handleReply()}
                  disabled={isReplying || !replyContent.trim()}
                  aria-label="Send reply"
                >
                  {isReplying ? "Sending..." : "Send Reply"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                minHeight: 360,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">
                Select a message to view its details.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      <FormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Compose Message"
        fields={formFields}
        initialValues={composeInitialValues}
        onValuesChange={setComposeValues}
        onSubmit={async (values) => {
          if (!values.recipientId || !values.content || !values.subject) {
            toast.error("Recipient, subject, and message are required.");
            return;
          }

          await sendMessage.mutateAsync({
            recipientId: values.recipientId as string,
            category: values.category as string,
            subject: values.subject as string,
            content: values.content as string,
          });
          setComposeValues(composeInitialValues);
          setComposeFormKey((current) => current + 1);
          setFormModalOpen(false);
          setComposeFormKey((prev) => prev + 1);
        }}
        submitText="Send"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        severity="error"
      />
    </Box>
  );
}
