# Hotel Management React Native App

Ứng dụng React Native cho hệ thống quản lý khách sạn, đồng bộ với Angular web app và NestJS backend.

## Cấu trúc dự án

```
hotelapp-react-native/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   └── login.tsx      # Login screen
│   └── (tabs)/            # Main app tabs
│       ├── index.tsx      # Home/Dashboard
│       └── rooms.tsx      # Rooms list
├── components/             # Reusable components
├── constants/             # Constants và config
│   └── api.ts            # API endpoints
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── hooks/                 # Custom hooks
├── services/              # API services
│   ├── api.ts            # Base API service
│   ├── auth.service.ts   # Authentication service
│   ├── rooms.service.ts  # Rooms service
│   └── hotels.service.ts # Hotels service
└── types/                 # TypeScript types
    └── index.ts          # Type definitions
```

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Cài đặt AsyncStorage (nếu chưa có):
```bash
npx expo install @react-native-async-storage/async-storage
```

3. Chạy ứng dụng:
```bash
npm start
# hoặc
npx expo start
```

## Tính năng

### Đã triển khai:
- ✅ Authentication (Login/Logout)
- ✅ API service base với token management
- ✅ Rooms service với đầy đủ methods
- ✅ Hotels service
- ✅ Auth context và protected routes
- ✅ Rooms list screen
- ✅ Home/Dashboard screen

### Cần triển khai thêm:
- Room detail screen
- Check-in/Check-out screens
- Booking modal
- Calendar view
- Financial reports
- Settings
- Notifications

## API Endpoints

Tất cả endpoints được định nghĩa trong `constants/api.ts` và sử dụng base URL:
- Base URL: `https://nest-production-8106.up.railway.app`
- API Prefix: `/api`

### Authentication
- `POST /api/users/login` - Đăng nhập
- `POST /api/users/logout` - Đăng xuất

### Rooms
- `GET /api/rooms` - Lấy danh sách phòng
- `GET /api/rooms/:id` - Lấy thông tin phòng
- `POST /api/rooms/checkin/:id` - Check-in phòng
- `POST /api/rooms/checkout/:id` - Check-out phòng
- `POST /api/rooms/booking` - Đặt phòng
- `POST /api/rooms/booking/cancel/:id` - Hủy đặt phòng
- `GET /api/rooms/bookings` - Lấy danh sách bookings

## Cấu trúc Services

### ApiService (Base)
- Xử lý authentication headers tự động
- Error handling
- Request/Response interceptors

### AuthService
- Login/Logout
- Token management
- User state management
- Role checking methods

### RoomsService
- getRooms() - Lấy danh sách phòng
- getRoomById() - Lấy thông tin phòng
- checkInRoom() - Check-in
- checkOutRoom() - Check-out
- createBooking() - Đặt phòng
- cancelBooking() - Hủy đặt phòng
- getBookings() - Lấy bookings

## Navigation

Ứng dụng sử dụng Expo Router với file-based routing:
- `/(auth)/login` - Màn hình đăng nhập
- `/(tabs)/` - Main app với tabs
  - `/(tabs)/index` - Home
  - `/(tabs)/rooms` - Rooms list

## Authentication Flow

1. User login → AuthService.login()
2. Token được lưu vào AsyncStorage
3. User data được lưu vào AuthContext
4. Protected routes tự động redirect nếu chưa login
5. Logout → Clear token và redirect về login

## Development

### Thêm service mới:
1. Tạo file trong `services/`
2. Import `apiService` từ `services/api.ts`
3. Sử dụng các methods: `get`, `post`, `put`, `delete`, `patch`

### Thêm screen mới:
1. Tạo file trong `app/` theo cấu trúc routing của Expo
2. Sử dụng `useAuth()` hook để truy cập user data
3. Sử dụng các services để fetch data

## Notes

- Tất cả API calls tự động thêm Authorization header nếu có token
- Token được lưu trong AsyncStorage
- Error handling được xử lý ở ApiService level
- Types được định nghĩa trong `types/index.ts`
