import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole, UserStatus, Department } from '../models/User.js';
import { ChatRoom, ChatRoomType, ChatRoomStatus } from '../models/ChatRoom.js';
import { Message, MessageType, MessageStatus } from '../models/Message.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

// Sample users data
const sampleUsers = [
  // Admin users
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123',
    role: UserRole.ADMIN,
    status: UserStatus.ONLINE,
    department: Department.GENERAL_SUPPORT,
    isOnline: true,
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      bio: 'System Administrator',
      location: 'Headquarters'
    }
  },
  {
    username: 'superadmin',
    email: 'superadmin@example.com',
    password: 'password123',
    role: UserRole.ADMIN,
    status: UserStatus.ONLINE,
    department: Department.GENERAL_SUPPORT,
    isOnline: true,
    profile: {
      firstName: 'Super',
      lastName: 'Admin',
      bio: 'Super Administrator',
      location: 'Headquarters'
    }
  },

  // Agent users
  {
    username: 'agent_john',
    email: 'agent@example.com',
    password: 'password123',
    role: UserRole.AGENT,
    status: UserStatus.ONLINE,
    department: Department.TECHNICAL_SUPPORT,
    specialization: ['Technical Issues', 'Hardware Support', 'Software Troubleshooting'],
    isOnline: true,
    profile: {
      firstName: 'John',
      lastName: 'Smith',
      bio: 'Technical Support Specialist with 5+ years experience',
      location: 'New York Office'
    }
  },
  {
    username: 'agent_sarah',
    email: 'sarah.agent@example.com',
    password: 'password123',
    role: UserRole.AGENT,
    status: UserStatus.ONLINE,
    department: Department.BILLING,
    specialization: ['Billing Issues', 'Payment Processing', 'Account Management'],
    isOnline: true,
    profile: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      bio: 'Billing Support Expert',
      location: 'Chicago Office'
    }
  },
  {
    username: 'agent_mike',
    email: 'mike.agent@example.com',
    password: 'password123',
    role: UserRole.AGENT,
    status: UserStatus.ONLINE,
    department: Department.SALES,
    specialization: ['Sales Inquiries', 'Product Information', 'Pricing'],
    isOnline: false,
    profile: {
      firstName: 'Mike',
      lastName: 'Wilson',
      bio: 'Sales Support Representative',
      location: 'Los Angeles Office'
    }
  },
  {
    username: 'agent_emma',
    email: 'emma.agent@example.com',
    password: 'password123',
    role: UserRole.AGENT,
    status: UserStatus.BUSY,
    department: Department.GENERAL_SUPPORT,
    specialization: ['General Inquiries', 'Customer Service', 'First Contact Resolution'],
    isOnline: true,
    profile: {
      firstName: 'Emma',
      lastName: 'Davis',
      bio: 'General Support Agent',
      location: 'Remote'
    }
  },

  // Regular users
  {
    username: 'user1',
    email: 'user@example.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'Alice',
      lastName: 'Cooper',
      bio: 'Regular user',
      location: 'San Francisco'
    }
  },
  {
    username: 'john_doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software Developer',
      location: 'Seattle'
    }
  },
  {
    username: 'jane_smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.OFFLINE,
    isOnline: false,
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Product Manager',
      location: 'Boston'
    }
  },
  {
    username: 'bob_wilson',
    email: 'bob.wilson@example.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'Bob',
      lastName: 'Wilson',
      bio: 'Marketing Specialist',
      location: 'Austin'
    }
  },
  {
    username: 'lisa_brown',
    email: 'lisa.brown@example.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.AWAY,
    isOnline: false,
    profile: {
      firstName: 'Lisa',
      lastName: 'Brown',
      bio: 'UX Designer',
      location: 'Portland'
    }
  }
];

// Sample chat rooms
const sampleChatRooms = [
  {
    name: 'General Discussion',
    type: ChatRoomType.GROUP,
    status: ChatRoomStatus.ACTIVE,
    description: 'General chat room for all users'
  },
  {
    name: 'Development Team',
    type: ChatRoomType.GROUP,
    status: ChatRoomStatus.ACTIVE,
    description: 'Private chat for development team'
  },
  {
    name: 'Marketing Team',
    type: ChatRoomType.GROUP,
    status: ChatRoomStatus.ACTIVE,
    description: 'Marketing team discussions'
  }
];

// Sample messages
const sampleMessages = [
  {
    content: 'Welcome to the general discussion room! Feel free to chat with everyone.',
    messageType: MessageType.TEXT
  },
  {
    content: 'Hello everyone! Great to be here.',
    messageType: MessageType.TEXT
  },
  {
    content: 'Has anyone tried the new features in the latest update?',
    messageType: MessageType.TEXT
  },
  {
    content: 'Yes, the new chat system is amazing! Real-time typing indicators work perfectly.',
    messageType: MessageType.TEXT
  },
  {
    content: 'I love the unread message count feature. Very helpful!',
    messageType: MessageType.TEXT
  }
];

class DatabaseSeeder {
  private users: any[] = [];
  private chatRooms: any[] = [];

  async connect() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  async clearDatabase() {
    try {
      console.log('🧹 Clearing existing data...');
      await Promise.all([
        User.deleteMany({}),
        ChatRoom.deleteMany({}),
        Message.deleteMany({})
      ]);
      console.log('✅ Database cleared');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  async seedUsers() {
    try {
      console.log('👥 Seeding users...');
      
      for (const userData of sampleUsers) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const user = new User({
          ...userData,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedUser = await user.save();
        this.users.push(savedUser);
        
        console.log(`   ✅ Created ${userData.role}: ${userData.username} (${userData.email})`);
      }
      
      console.log(`✅ Created ${this.users.length} users`);
    } catch (error) {
      console.error('❌ Failed to seed users:', error);
      throw error;
    }
  }

  async seedChatRooms() {
    try {
      console.log('💬 Seeding chat rooms...');
      
      for (const roomData of sampleChatRooms) {
        // Get random participants for each room
        const participants = this.getRandomParticipants(3, 6);
        const createdBy = participants[0];
        
        const chatRoom = new ChatRoom({
          ...roomData,
          participants: participants.map(user => user._id),
          createdBy: createdBy._id,
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedRoom = await chatRoom.save();
        this.chatRooms.push(savedRoom);
        
        console.log(`   ✅ Created chat room: ${roomData.name} with ${participants.length} participants`);
      }

      // Create some direct message rooms
      const directRooms = [
        [this.users[0], this.users[5]], // Admin and User1
        [this.users[2], this.users[6]], // Agent John and John Doe
        [this.users[3], this.users[7]], // Agent Sarah and Jane Smith
      ];

      for (const [user1, user2] of directRooms) {
        const chatRoom = new ChatRoom({
          type: ChatRoomType.DIRECT,
          status: ChatRoomStatus.ACTIVE,
          participants: [user1._id, user2._id],
          createdBy: user1._id,
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedRoom = await chatRoom.save();
        this.chatRooms.push(savedRoom);
        
        console.log(`   ✅ Created direct message room between ${user1.username} and ${user2.username}`);
      }
      
      console.log(`✅ Created ${this.chatRooms.length} chat rooms`);
    } catch (error) {
      console.error('❌ Failed to seed chat rooms:', error);
      throw error;
    }
  }

  async seedMessages() {
    try {
      console.log('📝 Seeding messages...');
      let totalMessages = 0;
      
      for (const chatRoom of this.chatRooms) {
        const participants = this.users.filter(user => 
          chatRoom.participants.includes(user._id)
        );
        
        // Create 3-8 messages per room
        const messageCount = Math.floor(Math.random() * 6) + 3;
        
        for (let i = 0; i < messageCount; i++) {
          const sender = participants[Math.floor(Math.random() * participants.length)];
          const messageData = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
          
          const message = new Message({
            chatRoomId: chatRoom._id,
            senderId: sender._id,
            content: `${messageData.content} (Message ${i + 1})`,
            messageType: messageData.messageType,
            status: MessageStatus.READ,
            deliveredTo: participants
              .filter(p => p._id.toString() !== sender._id.toString())
              .map(p => ({
                userId: p._id,
                deliveredAt: new Date(Date.now() - Math.random() * 60000) // Random delivery time within last minute
              })),
            readBy: participants
              .filter(p => p._id.toString() !== sender._id.toString())
              .slice(0, Math.floor(Math.random() * participants.length)) // Some users have read it
              .map(p => ({
                userId: p._id,
                readAt: new Date(Date.now() - Math.random() * 30000) // Random read time within last 30 seconds
              })),
            createdAt: new Date(Date.now() - (messageCount - i) * 60000), // Messages created in chronological order
            updatedAt: new Date()
          });

          await message.save();
          totalMessages++;
        }

        // Update chat room's last message
        const lastMessage = await Message.findOne({ chatRoomId: chatRoom._id })
          .sort({ createdAt: -1 });
        
        if (lastMessage) {
          chatRoom.lastMessage = lastMessage._id;
          chatRoom.lastActivity = lastMessage.createdAt;
          await chatRoom.save();
        }
      }
      
      console.log(`✅ Created ${totalMessages} messages across all chat rooms`);
    } catch (error) {
      console.error('❌ Failed to seed messages:', error);
      throw error;
    }
  }

  private getRandomParticipants(min: number, max: number) {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...this.users].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async printSummary() {
    try {
      console.log('\n📊 Seeding Summary:');
      console.log('='.repeat(50));
      
      const userCounts = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      
      userCounts.forEach(({ _id, count }) => {
        console.log(`   ${_id}: ${count} users`);
      });
      
      const chatRoomCount = await ChatRoom.countDocuments();
      const messageCount = await Message.countDocuments();
      
      console.log(`   Chat Rooms: ${chatRoomCount}`);
      console.log(`   Messages: ${messageCount}`);
      
      console.log('\n🔐 Login Credentials:');
      console.log('='.repeat(50));
      console.log('Admin:');
      console.log('   Email: admin@example.com | Password: password123');
      console.log('   Email: superadmin@example.com | Password: password123');
      console.log('\nAgents:');
      console.log('   Email: agent@example.com | Password: password123');
      console.log('   Email: sarah.agent@example.com | Password: password123');
      console.log('   Email: mike.agent@example.com | Password: password123');
      console.log('   Email: emma.agent@example.com | Password: password123');
      console.log('\nUsers:');
      console.log('   Email: user@example.com | Password: password123');
      console.log('   Email: john.doe@example.com | Password: password123');
      console.log('   Email: jane.smith@example.com | Password: password123');
      console.log('   Email: bob.wilson@example.com | Password: password123');
      console.log('   Email: lisa.brown@example.com | Password: password123');
      
    } catch (error) {
      console.error('❌ Failed to print summary:', error);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

async function runSeeder() {
  const seeder = new DatabaseSeeder();
  
  try {
    console.log('🌱 Starting database seeding...');
    console.log('='.repeat(50));
    
    await seeder.connect();
    await seeder.clearDatabase();
    await seeder.seedUsers();
    await seeder.seedChatRooms();
    await seeder.seedMessages();
    await seeder.printSummary();
    
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await seeder.disconnect();
  }
}

// Run the seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder();
}

export { runSeeder }; 