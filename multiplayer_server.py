#!/usr/bin/env python3
"""
Simple WebSocket multiplayer server for Minecraft game
Run this alongside the HTTP server: python multiplayer_server.py
"""

import asyncio
import websockets
import json
from datetime import datetime

# Store connected players
players = {}

async def handle_client(websocket, path):
    player_id = id(websocket)
    player_data = {
        'id': player_id,
        'name': 'Unknown',
        'position': {'x': 0, 'y': 40, 'z': 0},
        'rotation': {'yaw': 0, 'pitch': 0}
    }
    
    try:
        async for message in websocket:
            data = json.loads(message)
            
            if data['type'] == 'join':
                # Player joined
                player_data['name'] = data['name']
                player_data['worldType'] = data.get('worldType', 'normal')
                players[player_id] = {
                    'websocket': websocket,
                    'data': player_data
                }
                print(f"[{datetime.now().strftime('%H:%M:%S')}] {player_data['name']} joined (ID: {player_id})")
                
                # Send existing players to new player
                for pid, p in players.items():
                    if pid != player_id:
                        await websocket.send(json.dumps({
                            'type': 'playerUpdate',
                            'id': pid,
                            'name': p['data']['name'],
                            'position': p['data']['position'],
                            'rotation': p['data']['rotation']
                        }))
            
            elif data['type'] == 'playerUpdate':
                # Update player position
                if player_id in players:
                    players[player_id]['data']['position'] = data['position']
                    players[player_id]['data']['rotation'] = data['rotation']
                    
                    # Broadcast to all other players
                    broadcast_data = {
                        'type': 'playerUpdate',
                        'id': player_id,
                        'name': player_data['name'],
                        'position': data['position'],
                        'rotation': data['rotation']
                    }
                    
                    for pid, p in players.items():
                        if pid != player_id:
                            try:
                                await p['websocket'].send(json.dumps(broadcast_data))
                            except:
                                pass
            
            elif data['type'] == 'blockChange':
                # Broadcast block change to all other players
                broadcast_data = {
                    'type': 'blockChange',
                    'x': data['x'],
                    'y': data['y'],
                    'z': data['z'],
                    'blockType': data['blockType']
                }
                
                for pid, p in players.items():
                    if pid != player_id:
                        try:
                            await p['websocket'].send(json.dumps(broadcast_data))
                        except:
                            pass
    
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Player disconnected
        if player_id in players:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {player_data['name']} left (ID: {player_id})")
            
            # Notify other players
            for pid, p in players.items():
                if pid != player_id:
                    try:
                        await p['websocket'].send(json.dumps({
                            'type': 'playerLeft',
                            'id': player_id
                        }))
                    except:
                        pass
            
            del players[player_id]

async def main():
    print("="*50)
    print("🎮 Minecraft Multiplayer Server")
    print("="*50)
    print("Server starting on ws://localhost:8765")
    print("Make sure the HTTP server is running on port 8080")
    print("Players can now connect and play together!")
    print("-"*50)
    
    async with websockets.serve(handle_client, "localhost", 8765):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nServer shutting down...")
        print("Goodbye! 👋")
