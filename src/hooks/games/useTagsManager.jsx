import { useState, useEffect, useRef } from "react";
import { useApiMetadata } from "../api/useApiMetadata";

export const useTagsManager = (initialTags = []) => {
  const { createMetadata } = useApiMetadata();
  const [tagInput, setTagInput] = useState("");
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const prevInitialTagsRef = useRef(initialTags);

  // Synchronisation si les tags initiaux changent (ex: passage du mode ajout au mode édition)
  useEffect(() => {
    // Vérifier si initialTags a réellement changé en comparant les contenus
    const tagsChanged = 
      prevInitialTagsRef.current.length !== initialTags.length ||
      prevInitialTagsRef.current.some((tag, idx) => tag !== initialTags[idx]);
    
    if (tagsChanged) {
      setSelectedTags(initialTags);
      prevInitialTagsRef.current = initialTags;
    }
  }, [initialTags]);

  // Logique de suggestion
  useEffect(() => {
    if (tagInput.trim() === "") {
      setSuggestedTags([]);
    } else {
      const lowerInput = tagInput.toLowerCase();
      const suggestions = availableTags.filter(
        (tag) =>
          tag.tag_name?.toLowerCase().includes(lowerInput) &&
          !selectedTags.includes(tag._id)
      );
      setSuggestedTags(suggestions);
    }
  }, [tagInput, selectedTags, availableTags]);

  const addTag = async (tagVal) => {
    if (!tagVal) return;
    let tagToAdd = null;

    if (typeof tagVal === "object") {
      tagToAdd = availableTags.find((t) => t._id === tagVal._id);
    } else {
      const trimmed = tagVal.trim();
      if (!trimmed) return;
      tagToAdd = availableTags.find(
        (t) => t.tag_name?.toLowerCase() === trimmed.toLowerCase()
      );

      if (!tagToAdd) {
        try {
          const newTagData = await createMetadata("tag", {
            tag_name: trimmed,
            order: availableTags.length,
            color: "#5AF2FF",
          });
          tagToAdd = newTagData;
          setAvailableTags((prev) => [...prev, tagToAdd]);
        } catch (error) {
          console.error("Erreur création tag", error);
          return;
        }
      }
    }

    if (tagToAdd && !selectedTags.includes(tagToAdd._id)) {
      setSelectedTags((prev) => [...prev, tagToAdd._id]);
      setTagInput("");
    }
  };

  const removeTag = (tagIdToRemove) => {
    setSelectedTags((prev) => prev.filter((id) => id !== tagIdToRemove));
  };

  return {
    tagInput,
    setTagInput,
    suggestedTags,
    availableTags,
    setAvailableTags,
    selectedTags,
    addTag,
    removeTag,
  };
};