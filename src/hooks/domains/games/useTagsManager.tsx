import { useEffect, useRef, useState } from 'react'

import { useApiMetadata } from '@/hooks/api/useApiMetadata'

export const useTagsManager = (initialTags: any[] = []) => {
  const { createMetadata } = useApiMetadata()
  const [tagInput, setTagInput] = useState('')
  const [suggestedTags, setSuggestedTags] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<any[]>(initialTags)
  const prevInitialTagsRef = useRef(initialTags)

  // Synchronisation si les tags initiaux changent (ex: passage du mode ajout au mode édition)
  useEffect(() => {
    // Vérifier si initialTags a réellement changé en comparant les contenus
    const tagsChanged =
      prevInitialTagsRef.current.length !== initialTags.length ||
      prevInitialTagsRef.current.some((tag: any, idx: any) => tag !== initialTags[idx])

    if (tagsChanged) {
      setSelectedTags(initialTags)
      prevInitialTagsRef.current = initialTags
    }
  }, [initialTags])

  // Logique de suggestion
  const [prevSuggestDeps, setPrevSuggestDeps] = useState({ tagInput, selectedTags, availableTags })
  if (
    tagInput !== prevSuggestDeps.tagInput ||
    selectedTags !== prevSuggestDeps.selectedTags ||
    availableTags !== prevSuggestDeps.availableTags
  ) {
    setPrevSuggestDeps({ tagInput, selectedTags, availableTags })
    if (tagInput.trim() === '') {
      setSuggestedTags([])
    } else {
      const lowerInput = tagInput.toLowerCase()
      const suggestions = availableTags.filter(
        (tag: any) =>
          tag.tag_name?.toLowerCase().includes(lowerInput) && !selectedTags.includes(tag._id)
      )
      setSuggestedTags(suggestions)
    }
  }

  const addTag = async (tagVal: any) => {
    if (!tagVal) return
    let tagToAdd: any = null

    if (typeof tagVal === 'object') {
      tagToAdd = availableTags.find((t: any) => t._id === tagVal._id)
    } else {
      const trimmed = tagVal.trim()
      if (!trimmed) return
      tagToAdd = availableTags.find((t: any) => t.tag_name?.toLowerCase() === trimmed.toLowerCase())

      if (!tagToAdd) {
        try {
          const newTagData = await createMetadata('tag', {
            tag_name: trimmed,
            order: availableTags.length,
            color: '#5AF2FF',
          })
          tagToAdd = newTagData
          setAvailableTags((prev: any) => [...prev, tagToAdd])
        } catch (error: any) {
          console.error('Erreur création tag', error)
          return
        }
      }
    }

    const actualTagId = tagToAdd._id || tagToAdd.id
    if (tagToAdd && actualTagId && !selectedTags.includes(actualTagId)) {
      setSelectedTags((prev: any) => [...prev, actualTagId])
      setTagInput('')
    }
  }

  const removeTag = (tagIdToRemove: any) => {
    setSelectedTags((prev: any) => prev.filter((id: any) => id !== tagIdToRemove))
  }

  return {
    tagInput,
    setTagInput,
    suggestedTags,
    availableTags,
    setAvailableTags,
    selectedTags,
    addTag,
    removeTag,
  }
}
