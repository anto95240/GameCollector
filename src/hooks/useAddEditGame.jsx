import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { faList, faStar, faGamepad, faImage, faCheckCircle, faTag } from "@fortawesome/free-solid-svg-icons";

export const SECTIONS = [
    { id: "desc", icon: faList, label: "gameForm.sections.description" },
    { id: "rate", icon: faStar, label: "gameForm.sections.rating" },
    { id: "detail", icon: faGamepad, label: "gameForm.sections.details" },
    { id: "img", icon: faImage, label: "gameForm.sections.image" },
    { id: "status", icon: faCheckCircle, label: "gameForm.sections.status" },
    { id: "tags", icon: faTag, label: "gameForm.sections.tags" },
];

export const MOCK_OPTIONS = {
    genre: [
        {value: "", label: "Sélectionner un genre"},
        {value: "RPG", label: "RPG"}, {value: "Action", label: "Action"}, {value: "Aventure", label: "Aventure"}
    ],
    platform: [
        {value: "", label: "Sélectionner une plateforme"},
        {value: "PS5", label: "PS5"}, {value: "PC", label: "PC"}, {value: "Switch", label: "Switch"}
    ],
    status: [
        {value: "", label: "Sélectionner un statut"},
        {value: "Terminé", label: "Terminé"}, {value: "En cours", label: "En cours"}, {value: "Pas commencé", label: "Pas commencé"}
    ],
    rating: [
        {value: "", label: "Sélectionner une note"},
        {value: 5, label: "⭐⭐⭐⭐⭐"}, {value: 4, label: "⭐⭐⭐⭐"}, {value: 3, label: "⭐⭐⭐"}, {value: 2, label: "⭐⭐"}, {value: 1, label: "⭐"}
    ]
};

const AVAILABLE_TAGS = [
    "Action", "Aventure", "RPG", "FPS", "Monde Ouvert", 
    "Narratif", "Horreur", "Sci-Fi", "Fantasy", "Indie", 
    "Rétro", "Course", "Sport", "Stratégie", "Survie", 
    "Coop", "Multijoueur", "Solo", "Puzzle"
];

export const useAddEditGame = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    
    const gameToEdit = location.state?.game; 
    const isEditMode = !!gameToEdit;

    // --- STATES ---
    const [activeSection, setActiveSection] = useState("desc");
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    
    const [tagInput, setTagInput] = useState("");
    const [suggestedTags, setSuggestedTags] = useState([]);
    const isScrollingRef = useRef(false);
    const [previewImg, setPreviewImg] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const [formData, setFormData] = useState({
        name: "", description: "", rating: "", comment: "",
        genre: "", platform: "", year: "", playTime: "",
        developer: "", achievements: "", status: "", tags: [], image: null
    });

    // --- INITIALISATION ---
    useEffect(() => {
        if (isEditMode) {
            setFormData({
                name: gameToEdit.name || "",
                description: gameToEdit.description || "",
                rating: gameToEdit.rating || "",
                comment: gameToEdit.userNotes || "",
                genre: gameToEdit.genre || "",
                platform: gameToEdit.platform || "",
                year: gameToEdit.year || "",
                playTime: gameToEdit.playTime || "",
                developer: gameToEdit.developer || "",
                achievements: gameToEdit.achievements || "",
                status: gameToEdit.status || "",
                tags: Array.isArray(gameToEdit.tags) ? gameToEdit.tags : [],
                image: null
            });
            if (gameToEdit.image) setPreviewImg(gameToEdit.image);
        }
    }, [isEditMode, gameToEdit]);

    // --- SCROLL SPY ---
    useEffect(() => {
        const handleScroll = () => {
            if (isScrollingRef.current) return;
            const scrollY = window.scrollY;
            const triggerPoint = scrollY + 150; 
            
            if ((window.innerHeight + scrollY) >= document.body.offsetHeight - 50) {
               setActiveSection(SECTIONS[SECTIONS.length - 1].id);
               return;
            }

            for (const section of SECTIONS) {
                const element = document.getElementById(section.id);
                if (element) {
                    const { offsetHeight } = element;
                    const rect = element.getBoundingClientRect();
                    const top = rect.top + window.scrollY;
                    const bottom = top + offsetHeight;

                    if (triggerPoint >= top && triggerPoint < bottom) {
                        setActiveSection(section.id);
                        break;
                    }
                }
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (!element) return;
        isScrollingRef.current = true;
        setActiveSection(id);
        setShowMobileMenu(false);
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => { isScrollingRef.current = false; }, 1000);
    };

    // --- TAGS LOGIC ---
    useEffect(() => {
        if (tagInput.trim() === "") {
            setSuggestedTags([]);
        } else {
            const lowerInput = tagInput.toLowerCase();
            const suggestions = AVAILABLE_TAGS.filter(tag => 
                tag.toLowerCase().includes(lowerInput) && !formData.tags.includes(tag)
            );
            setSuggestedTags(suggestions);
        }
    }, [tagInput, formData.tags]);

    const addTag = (tagVal) => {
        const trimmed = tagVal.trim();
        if (trimmed !== "" && !formData.tags.includes(trimmed)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
            setTagInput("");
            setSuggestedTags([]);
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            addTag(tagInput);
        }
    };

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            setPreviewImg(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsAnimating(true);
        setTimeout(() => {
            setIsAnimating(false);
            navigate("/list");
        }, 1500);
    };

    return {
        t, navigate, isEditMode, gameToEdit,
        activeSection, showMobileMenu, setShowMobileMenu, scrollToSection,
        formData, setFormData, handleChange, handleFileChange, handleSubmit,
        tagInput, setTagInput, suggestedTags, handleTagKeyDown, addTag, handleRemoveTag,
        previewImg, isAnimating
    };
};