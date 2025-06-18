import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole, UserStatus, Department } from '../models/User.js';
import { ChatRoom, ChatRoomType, ChatRoomStatus } from '../models/ChatRoom.js';
import { Message, MessageType, MessageStatus } from '../models/Message.js';
import dotenv from 'dotenv';
import { DatabaseConfig } from '../config/database.js';

// Load environment variables
dotenv.config();

const sampleUsers = [
  // 1 Admin
  {
    username: 'admin_ram',
    email: 'ram.admin@hamrotech.com',
    password: 'password123',
    role: UserRole.ADMIN,
    status: UserStatus.ONLINE,
    department: Department.GENERAL_SUPPORT,
    isOnline: true,
    profile: {
      firstName: 'Ram',
      lastName: 'Shrestha',
      bio: 'मुख्य प्रशासक - System Administrator with full access',
      location: 'काठमाडौं, नेपाल'
    }
  },
  // 2 Agents
  {
    username: 'agent_suresh',
    email: 'suresh.agent@hamrotech.com',
    password: 'password123',
    role: UserRole.AGENT,
    status: UserStatus.ONLINE,
    department: Department.TECHNICAL_SUPPORT,
    specialization: 'Technical Issues, Hardware Support, Network Troubleshooting',
    isOnline: true,
    profile: {
      firstName: 'Suresh',
      lastName: 'Gurung',
      bio: 'प्राविधिक सहायता विशेषज्ञ - Senior Technical Support Specialist with 5+ years experience',
      location: 'पोखरा, नेपाल'
    }
  },
  {
    username: 'agent_sunita',
    email: 'sunita.agent@hamrotech.com',
    password: 'password123',
    role: UserRole.AGENT,
    status: UserStatus.ONLINE,
    department: Department.BILLING,
    specialization: 'Billing Issues, Payment Processing, Account Management',
    isOnline: true,
    profile: {
      firstName: 'Sunita',
      lastName: 'Thapa',
      bio: 'बिलिङ र खाता व्यवस्थापन विशेषज्ञ - Billing and Account Management Expert',
      location: 'भक्तपुर, नेपाल'
    }
  },
  // 4 Regular Users
  {
    username: 'aarti_paudel',
    email: 'aarti.paudel@technepal.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'Aarti',
      lastName: 'Paudel',
      bio: 'Software Engineer at TechNepal Pvt Ltd',
      location: 'काठमाडौं, नेपाल'
    }
  },
  {
    username: 'binod_sharma',
    email: 'binod.sharma@digitalnepal.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'Binod',
      lastName: 'Sharma',
      bio: 'Digital Marketing Manager',
      location: 'ललितपुर, नेपाल'
    }
  },
  {
    username: 'chitra_rai',
    email: 'chitra.rai@designstudio.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'Chitra',
      lastName: 'Rai',
      bio: 'Product Designer',
      location: 'धरान, नेपाल'
    }
  },
  {
    username: 'dipesh_nepal',
    email: 'dipesh.nepal@projecthub.com',
    password: 'password123',
    role: UserRole.USER,
    status: UserStatus.ONLINE,
    isOnline: true,
    profile: {
      firstName: 'Dipesh',
      lastName: 'Nepal',
      bio: 'Project Manager',
      location: 'बुटवल, नेपाल'
    }
  }
];

const chatRoomConfigurations = [
  // SUPPORT CHAT ROOMS
  {
    name: 'प्राविधिक सहायता - Server समस्या',
    type: ChatRoomType.SUPPORT,
    status: ChatRoomStatus.ACTIVE,
    agentEmail: 'suresh.agent@hamrotech.com',
    participantEmails: ['aarti.paudel@technepal.com', 'binod.sharma@digitalnepal.com'],
    metadata: {
      subject: 'Server connectivity and performance issues',
      priority: 'high',
      tags: ['server', 'technical', 'connectivity']
    }
  },
  {
    name: 'बिलिङ र खाता सहायता',
    type: ChatRoomType.SUPPORT,
    status: ChatRoomStatus.ACTIVE,
    agentEmail: 'sunita.agent@hamrotech.com',
    participantEmails: ['chitra.rai@designstudio.com', 'dipesh.nepal@projecthub.com'],
    metadata: {
      subject: 'Monthly billing and payment inquiries',
      priority: 'high',
      tags: ['billing', 'payment', 'account']
    }
  },

  // DIRECT CHAT ROOMS (peer-to-peer conversations)
  {
    name: null, // Direct chats don't need explicit names
    type: ChatRoomType.DIRECT,
    status: ChatRoomStatus.ACTIVE,
    agentEmail: null, // No agent for direct chats
    participantEmails: ['aarti.paudel@technepal.com', 'chitra.rai@designstudio.com'],
    metadata: {
      subject: 'Project collaboration discussion',
      tags: ['collaboration', 'project']
    }
  },
  {
    name: null,
    type: ChatRoomType.DIRECT,
    status: ChatRoomStatus.ACTIVE,
    agentEmail: null,
    participantEmails: ['binod.sharma@digitalnepal.com', 'dipesh.nepal@projecthub.com'],
    metadata: {
      subject: 'Marketing and project coordination',
      tags: ['marketing', 'project']
    }
  }
];

// Sample messages with relevant Nepali context
const sampleMessageTemplates = {
  technical: [
    'नमस्कार! Server मा connection problem भएको छ। कृपया मद्दत गर्नुहोस्।',
    'हाम्रो website load भइरहेको छैन। के गर्ने?',
    'Database backup कसरी लिने? Process के हो?',
    'SSL certificate expire भएको notification आएको छ।',
    'Email server configuration गर्न मद्दत चाहिन्छ।',
    'API response slow आइरहेको छ। Optimize कसरी गर्ने?'
  ],
  billing: [
    'मेरो यस महिनाको bill कति आएको छ?',
    'eSewa बाट payment गरेको तर reflect भएको छैन।',
    'Khalti मा payment fail भयो। फेरि try गर्दा double charge भयो।',
    'Monthly subscription plan change गर्न चाहन्छु।',
    'Invoice download गर्न सकिँदैन। PDF file corrupt छ।',
    'Refund process के हो? कति दिन लाग्छ?'
  ],
  sales: [
    'तपाईंको premium plan को features के के छन्?',
    'Enterprise package को pricing कति छ?',
    'Free trial period कति दिनको हुन्छ?',
    'अन्य competitor हरूसँग comparison गर्न सक्नुहुन्छ?',
    'Custom solution बनाउन सक्नुहुन्छ?',
    'Demo schedule गर्न चाहन्छु। कहिले available छ?'
  ],
  direct: [
    'Hey! How is your project going?',
    'तपाईंको काम कस्तो चलिरहेको छ?',
    'Can we discuss the deadline for the new feature?',
    'Meeting को लागि कहिले free हुनुहुन्छ?',
    'I think we should collaborate on this task.',
    'Your expertise would be really helpful here.',
    'Let me know if you need any assistance.',
    'Great work on the recent updates!',
    'सहयोग गर्न पाएर खुशी लाग्यो।',
    'Looking forward to working together more.',
    'Thanks for the quick response!',
    'Perfect! That sounds like a good plan.'
  ],
  general: [
    'धन्यवाद! तपाईंको सहायता निकै राम्रो लाग्यो।',
    'अब problem solve भयो। Thank you so much!',
    'अझै केही confusion छ। फेरि explain गर्न सक्नुहुन्छ?',
    'यो process को documentation कहाँ पाउन सकिन्छ?',
    'सबै कुरा clear भयो। Great support team!',
    'Next step के गर्ने? Guide गर्नुहोस्।'
  ]
};

class DatabaseSeeder {
  private users: any[] = [];
  private chatRooms: any[] = [];

  async connect() {
    try {
      await DatabaseConfig.connectMongoDB();
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  async clearDatabase() {
    try {
      console.log('🧹 Clearing existing data...');
      
      // Check if data already exists
      const existingUsers = await User.countDocuments();
      const existingRooms = await ChatRoom.countDocuments();
      const existingMessages = await Message.countDocuments();
      
      if (existingUsers > 0 || existingRooms > 0 || existingMessages > 0) {
        console.log(`   Found existing data: ${existingUsers} users, ${existingRooms} rooms, ${existingMessages} messages`);
        await Promise.all([
          User.deleteMany({}),
          ChatRoom.deleteMany({}),
          Message.deleteMany({})
        ]);
        console.log('✅ Existing data cleared for fresh seeding');
      } else {
        console.log('   No existing data found, proceeding with fresh seeding');
      }
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  async seedUsers() {
    try {
      console.log('👥 Seeding users with Nepali names...');
      
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
      
      console.log(`✅ Created ${this.users.length} users with Nepali names`);
    } catch (error) {
      console.error('❌ Failed to seed users:', error);
      throw error;
    }
  }

  async seedChatRooms() {
    try {
      console.log('💬 Seeding chat rooms with Nepali context...');
      
      // Create chat rooms according to the configuration
      for (const config of chatRoomConfigurations) {
        // Find participants by emails
        const participants = config.participantEmails.map(email => 
          this.users.find(user => user.email === email)
        ).filter(Boolean);

        if (participants.length !== config.participantEmails.length) {
          console.error(`❌ Some participants not found for room: ${config.name || 'Direct Chat'}`);
          continue;
        }

        let allParticipants = participants;
        let assignedAgent = null;

        // Handle support chats (with agents)
        if (config.type === ChatRoomType.SUPPORT && config.agentEmail) {
          const agent = this.users.find(user => user.email === config.agentEmail);
          if (!agent) {
            console.error(`❌ Agent not found: ${config.agentEmail}`);
            continue;
          }
          allParticipants = [agent, ...participants];
          assignedAgent = agent._id;
        }

        const createdBy = participants[0]; // First participant creates the room

        const chatRoom = new ChatRoom({
          name: config.name,
          type: config.type,
          status: config.status,
          participants: allParticipants.map(user => user._id),
          assignedAgent: assignedAgent,
          createdBy: createdBy._id,
          metadata: config.metadata,
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedRoom = await chatRoom.save();
        this.chatRooms.push(savedRoom);

        // Update agent's assigned chats (only for support rooms)
        if (assignedAgent) {
          await User.findByIdAndUpdate(assignedAgent, {
            $addToSet: { assignedChats: savedRoom._id }
          });
        }
        
        const roomDisplayName = config.name || `Direct chat between ${participants.map(p => p.username).join(' & ')}`;
        console.log(`   ✅ Created ${config.type} room: ${roomDisplayName}`);
        
        if (assignedAgent) {
          const agent = allParticipants.find(p => p._id.toString() === assignedAgent.toString());
          console.log(`      Agent: ${agent.username} (${agent.email})`);
        }
        console.log(`      Participants: ${participants.map(p => p.username).join(', ')}`);
      }
      
      console.log(`✅ Created ${this.chatRooms.length} chat rooms with Nepali context`);
      
      // Summary of chat room types
      const supportRooms = this.chatRooms.filter(r => r.type === ChatRoomType.SUPPORT).length;
      const directRooms = this.chatRooms.filter(r => r.type === ChatRoomType.DIRECT).length;
      console.log(`   Support rooms: ${supportRooms}`);
      console.log(`   Direct rooms: ${directRooms}`);
      
      // Summary of assignments
      console.log('\n📊 Agent Assignment Summary:');
      const agentUsers = this.users.filter(user => user.role === UserRole.AGENT);
      for (const agent of agentUsers) {
        const agentRooms = this.chatRooms.filter(room => 
          room.assignedAgent && room.assignedAgent.toString() === agent._id.toString()
        );
        console.log(`   ${agent.username}: ${agentRooms.length} support rooms assigned`);
      }

      // Check participant usage
      const regularUsers = this.users.filter(user => user.role === UserRole.USER);
      const usedUsers = new Set();
      
      for (const room of this.chatRooms) {
        for (const participantId of room.participants) {
          const participant = this.users.find(u => u._id.toString() === participantId.toString());
          if (participant && participant.role === UserRole.USER) {
            usedUsers.add(participant.email);
          }
        }
      }
      
      console.log(`   Regular users used: ${usedUsers.size}/${regularUsers.length}`);
      
    } catch (error) {
      console.error('❌ Failed to seed chat rooms:', error);
      throw error;
    }
  }

  async seedMessages() {
    try {
      console.log('📝 Seeding contextual messages...');
      let totalMessages = 0;
      
      for (const chatRoom of this.chatRooms) {
        const participants = this.users.filter(user => 
          chatRoom.participants.includes(user._id)
        );
        
        // Determine message type based on chat room type and agent department
        const agent = participants.find(p => p.role === UserRole.AGENT);
        let messageTemplates = sampleMessageTemplates.general;
        
        if (chatRoom.type === ChatRoomType.DIRECT) {
          // Direct chats use direct message templates
          messageTemplates = [...sampleMessageTemplates.direct, ...sampleMessageTemplates.general];
        } else if (agent) {
          // Support chats use department-specific templates
          switch (agent.department) {
            case Department.TECHNICAL_SUPPORT:
              messageTemplates = [...sampleMessageTemplates.technical, ...sampleMessageTemplates.general];
              break;
            case Department.BILLING:
              messageTemplates = [...sampleMessageTemplates.billing, ...sampleMessageTemplates.general];
              break;
            case Department.SALES:
              messageTemplates = [...sampleMessageTemplates.sales, ...sampleMessageTemplates.general];
              break;
          }
        }
        
        // Create 4-8 messages per room for realistic conversation
        const messageCount = Math.floor(Math.random() * 5) + 4;
        
        for (let i = 0; i < messageCount; i++) {
          const sender = participants[Math.floor(Math.random() * participants.length)];
          const messageContent = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
          
          const message = new Message({
            chatRoomId: chatRoom._id,
            senderId: sender._id,
            content: messageContent,
            messageType: MessageType.TEXT,
            status: MessageStatus.READ,
            deliveredTo: participants
              .filter(p => p._id.toString() !== sender._id.toString())
              .map(p => ({
                userId: p._id,
                deliveredAt: new Date(Date.now() - Math.random() * 60000) // Random delivery time within last minute
              })),
            readBy: participants
              .filter(p => p._id.toString() !== sender._id.toString())
              .map(p => ({
                userId: p._id,
                readAt: new Date(Date.now() - Math.random() * 30000) // Random read time within last 30 seconds
              })),
            createdAt: new Date(Date.now() - (messageCount - i) * 120000), // Messages created in chronological order (2 min intervals)
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
      
      console.log(`✅ Created ${totalMessages} contextual messages across all chat rooms`);
    } catch (error) {
      console.error('❌ Failed to seed messages:', error);
      throw error;
    }
  }

  async printSummary() {
    try {
      console.log('\n📊 Seeding Summary:');
      console.log('='.repeat(60));
      
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
      
      console.log('\n🔐 नेपाली Login Credentials:');
      console.log('='.repeat(60));
      console.log('Admin (1 user):');
      console.log('   Email: ram.admin@hamrotech.com | Password: password123');
      console.log('   Name: Ram Shrestha (मुख्य प्रशासक)');
      
      console.log('\nAgents (2 users):');
      console.log('   Email: suresh.agent@hamrotech.com | Password: password123');
      console.log('   Name: Suresh Gurung (प्राविधिक सहायता विशेषज्ञ)');
      console.log('   Email: sunita.agent@hamrotech.com | Password: password123');
      console.log('   Name: Sunita Thapa (बिलिङ र खाता व्यवस्थापन)');
      
      console.log('\nRegular Users (4 users):');
      const regularUsers = [
        'aarti.paudel@technepal.com - Aarti Paudel (Software Engineer)',
        'binod.sharma@digitalnepal.com - Binod Sharma (Digital Marketing)',
        'chitra.rai@designstudio.com - Chitra Rai (Product Designer)',
        'dipesh.nepal@projecthub.com - Dipesh Nepal (Project Manager)'
      ];
      
      regularUsers.forEach(user => {
        console.log(`   Email: ${user} | Password: password123`);
      });
      
      console.log('\n🏢 Chat Room Names:');
      console.log('='.repeat(60));
      this.chatRooms.forEach(room => {
        const displayName = room.name || `[Direct Chat - ${room.type}]`;
        console.log(`   • ${displayName}`);
      });
      
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
    console.log('🌱 Starting database seeding with Nepali context...');
    console.log('='.repeat(60));
    
    await seeder.connect();
    await seeder.clearDatabase();
    await seeder.seedUsers();
    await seeder.seedChatRooms();
    await seeder.seedMessages();
    await seeder.printSummary();
    
    console.log('\n🎉 नेपाली Database seeding completed successfully!');
    
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