import { create } from 'zustand'
import { nanoid } from 'nanoid'

const getLocalStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
const setLocalStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const useStore = create((set) => ({
  texture: 'grass',
  cubes: getLocalStorage('cubes') || [],
  terrain: [],
  
  initializeTerrain: (blocks) => {
    set(() => ({ terrain: blocks }))
  },
  
  addCube: (x, y, z) => {
    set((state) => ({
      cubes: [
        ...state.cubes,
        {
          id: nanoid(),
          pos: [x, y, z],
          texture: state.texture,
        },
      ],
    }))
  },
  
  removeCube: (id) => {
    set((state) => ({
      cubes: state.cubes.filter((cube) => cube.id !== id),
    }))
  },
  
  setTexture: (texture) => {
    set(() => ({ texture }))
  },
  
  saveWorld: () => {
    set((state) => {
      setLocalStorage('cubes', state.cubes)
      return state
    })
  },
  
  resetWorld: () => {
    set((state) => ({ 
      cubes: [],
      terrain: state.terrain
    }))
    setLocalStorage('cubes', [])
  },
}))
