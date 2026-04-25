# Tic Tac Toe Pro - Setup Guide

This project consists of a separate Backend and Frontend.

## Prerequisites
- Node.js (v16+)
- MongoDB (Running locally on `mongodb://localhost:27017/tictactoe`)

## 1. Backend Setup
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:5001`.

## 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The application will be available at `http://localhost:5173`.

## Features
- **Local Multiplayer**: Play with a friend on the same device.
- **Computer Mode**: Play against an AI (Minimax algorithm).
- **Online Multiplayer**: Real-time play using Socket.io and high-end matchmaking.
- **Friend System**: Add friends by username and invite them to games.
- **Stats Tracking**: Automatically tracks wins, losses, and draws for authenticated users.
- **Guest Mode**: Play without an account (stats not saved).
