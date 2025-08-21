import type { FileUpload } from 'graphql-upload/processRequest.mjs';

export interface File {
  filename: string;
  mimetype: string;
  encoding: string;
}

export interface LoginResponse {
  user: UserBase;
  token: string;
}

export interface UserCounts {
  followers: number;
  following: number;
  posts: number;
  receivedNotifications: number;
}

export interface UserBase {
  id: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  joinDate: Date;
  headerUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  passwordHash: string | null;
  provider: string | null;
  providerProfileId: string | null;
}

export interface UserWithInclusions extends UserBase {
  following: UserBase[];
  _count: UserCounts;
}

export interface PostBase {
  id: number;
  timestamp: Date;
  feedItemType: string;
  text: string | null;
  imageUrl: string | null;
  userId: number;
}

export interface PostWithInclusions extends PostBase {
  user: UserBase;
  likes: UserBase[];
  pollChoices: Choice[];
  reposts: RepostBase[];
  _count: { comments: number };
}

export interface PostWithComments extends PostWithInclusions {
  comments: CommentWithInclusions[];
}

export interface Choice {
  id: number;
  text: string;
  postId: number;
  votes: UserBase[];
}

export interface CommentBase {
  id: number;
  timestamp: Date;
  feedItemType: string;
  text: string | null;
  imageUrl: string | null;
  userId: number;
  postId: number;
  parentId: number | null;
}

export interface CommentWithInclusions extends CommentBase {
  user: UserBase;
  likes: UserBase[];
  reposts: RepostBase[];
  _count: { replies: number };
}

export interface CommentWithPost extends CommentBase {
  post: PostWithInclusions;
  parent: CommentWithInclusions | null;
}

export interface CommentWithReplies extends CommentWithPost {
  replies: CommentWithInclusions[];
  commentChain: CommentWithInclusions[];
}

export interface RepostBase {
  id: number;
  timestamp: Date;
  feedItemType: string;
  userId: number;
  postId: number | null;
  commentId: number | null;
}

export interface RepostWithInclusions extends RepostBase {
  user: UserBase;
  post: PostBase | null;
  comment: CommentBase | null;
}

export interface Notification {
  id: number;
  timestamp: Date;
  type: string;
  isRead: boolean;
  sourceUser: UserBase;
  sourceUserId: number;
  targetUserId: number;
  postId: number | null;
  commentId: number | null;
}

export interface RoomBase {
  id: number;
  lastUpdated: Date;
}

export interface RoomWithInclusions extends RoomBase {
  users: UserBase[];
  messages: Message[];
}

export interface Message {
  id: number;
  timestamp: Date;
  text: string | null;
  imageUrl: string | null;
  userId: number;
  roomId: number;
}

export type PostOrRepost = PostWithInclusions | RepostWithInclusions;

export interface CreateUserArgs {
  username: string;
  displayName?: string | null;
  password: string;
  passwordConfirmation: string;
}

export interface UpdateProfileArgs {
  pfp?: Promise<FileUpload>;
  headerImage?: Promise<FileUpload>;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
}

export interface UpdatePasswordArgs {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface IndexPostArgs {
  postCursor?: string;
  repostCursor?: string;
  timestamp?: string;
}

export interface UserPostArgs {
  userId: string;
  postCursor?: string;
  repostCursor?: string;
}

export interface MutateContentArgs {
  text?: string;
  gifUrl?: string;
  image?: Promise<FileUpload>;
}
