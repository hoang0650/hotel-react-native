import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { format } from '@/utils/dateUtils';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChatBot({ visible, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là trợ lý AI của hệ thống quản lý khách sạn. Tôi có thể giúp gì cho bạn?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && messages.length > 0) {
      // Scroll to bottom when new message is added
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  const getCurrentTime = (): string => {
    const now = new Date();
    return format(now, 'HH:mm');
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response (in real app, call AI API)
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage.text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const generateAIResponse = (userQuestion: string): string => {
    const question = userQuestion.toLowerCase();
    
    // Simple rule-based responses (in real app, use AI API)
    if (question.includes('phòng') || question.includes('room')) {
      return 'Bạn có thể quản lý phòng trong tab "Phòng". Ở đó bạn có thể thêm, sửa, xóa thông tin phòng và kiểm tra tình trạng phòng.';
    }
    if (question.includes('check-in') || question.includes('checkin')) {
      return 'Để check-in khách, bạn cần vào tab "Sơ đồ phòng", chọn phòng trống và nhấn nút "Check-in". Sau đó điền thông tin khách hàng và chọn loại giá (theo giờ, theo ngày, qua đêm).';
    }
    if (question.includes('check-out') || question.includes('checkout')) {
      return 'Để check-out khách, bạn cần vào tab "Sơ đồ phòng", chọn phòng đang có khách và nhấn nút "Check-out". Hệ thống sẽ tự động tính tiền phòng, dịch vụ và hiển thị tổng tiền cần thanh toán.';
    }
    if (question.includes('hóa đơn') || question.includes('invoice')) {
      return 'Bạn có thể xem hóa đơn trong tab "Báo cáo" > "Hóa đơn". Ở đó bạn có thể xem tất cả hóa đơn, lọc theo ngày, và xuất báo cáo.';
    }
    if (question.includes('đặt phòng') || question.includes('booking')) {
      return 'Bạn có thể xem lịch đặt phòng trong tab "Lịch phòng". Ở đó bạn có thể xem tất cả đặt phòng theo ngày và quản lý chúng.';
    }
    if (question.includes('dịch vụ') || question.includes('service')) {
      return 'Bạn có thể quản lý dịch vụ trong tab "Truy cập nhanh" > "Dịch vụ". Ở đó bạn có thể thêm, sửa, xóa dịch vụ và quản lý giá cả.';
    }
    if (question.includes('thống kê') || question.includes('statistics')) {
      return 'Bạn có thể xem thống kê doanh thu và lượt bán phòng trong tab "Tổng quan". Ở đó có biểu đồ hiển thị theo ngày, tuần, tháng.';
    }
    if (question.includes('giao ca') || question.includes('shift')) {
      return 'Bạn có thể xem lịch sử giao ca trong tab "Báo cáo" > "Lịch sử giao ca". Ở đó bạn có thể xem tất cả các ca đã giao và chi tiết từng ca.';
    }
    if (question.includes('thanh toán') || question.includes('payment')) {
      return 'Bạn có thể xem lịch sử thanh toán trong tab "Báo cáo" > "Lịch sử thanh toán". Ở đó bạn có thể xem tất cả giao dịch thanh toán và lọc theo trạng thái.';
    }
    
    // Default response
    return 'Cảm ơn bạn đã hỏi. Tôi có thể giúp bạn với các vấn đề về quản lý phòng, check-in/check-out, hóa đơn, đặt phòng, dịch vụ, thống kê, giao ca, và thanh toán. Bạn muốn biết thêm về điều gì?';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Trợ lý AI</Text>
              <Text style={styles.headerSubtitle}>Luôn sẵn sàng hỗ trợ bạn</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
                ]}
              >
                {!message.isUser && (
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>AI</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userMessageBubble : styles.aiMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser ? styles.userMessageText : styles.aiMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text style={styles.messageTime}>
                    {format(message.timestamp, 'HH:mm')}
                  </Text>
                </View>
                {message.isUser && (
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>👤</Text>
                  </View>
                )}
              </View>
            ))}
            {isTyping && (
              <View style={[styles.messageContainer, styles.aiMessageContainer]}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>AI</Text>
                </View>
                <View style={[styles.messageBubble, styles.aiMessageBubble]}>
                  <ActivityIndicator size="small" color="#666" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => {
                // TODO: Handle attach image/file
              }}
            >
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập câu hỏi của bạn..."
              placeholderTextColor="#999"
              multiline
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendIcon}>✈</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  userMessageBubble: {
    backgroundColor: '#1890ff',
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#52c41a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  attachIcon: {
    fontSize: 24,
    color: '#666',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#1890ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d9d9d9',
  },
  sendIcon: {
    fontSize: 20,
    color: '#fff',
  },
});

