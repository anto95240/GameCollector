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
    
    // Remplacement de isScrollingRef par un useRef pour bloquer l'observer lors du clic
    const isClickScrolling = useRef(false);
    
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

    // --- SCROLL SPY (INTERSECTION OBSERVER) ---
    useEffect(() => {
        const handleIntersect = (entries) => {
            // Si on est en train de scroller via un clic menu, on ignore l'observer pour éviter les sauts
            if (isClickScrolling.current) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersect, {
            root: null,
            // rootMargin définit une zone active au milieu de l'écran (-50% en haut, -50% en bas)
            // L'intersection se déclenche quand un élément traverse cette ligne centrale invisible
            rootMargin: '-45% 0px -45% 0px', 
            threshold: 0
        });

        // On observe toutes les sections (elles doivent avoir la classe 'form-section')
        const sections = document.querySelectorAll('.form-section');
        sections.forEach((section) => observer.observe(section));

        return () => {
            sections.forEach((section) => observer.unobserve(section));
        };
    }, []);

    // --- SCROLL TO SECTION (CENTERED) ---
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            isClickScrolling.current = true;
            setActiveSection(id);
            setShowMobileMenu(false);

            // Scroll fluide qui centre l'élément verticalement
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });

            // On réactive l'observer après l'animation de scroll (environ 1s)
            setTimeout(() => {
                isClickScrolling.current = false;
            }, 1000);
        }
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

    // --- HANDLESUBMIT ---
    const createSlug = (name) => {
        return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsAnimating(true);
        setTimeout(() => {
            const slug = createSlug(formData.name);
            navigate(`/game/${slug}`); 
        }, 2000); 
    };

    return {
        t, navigate, isEditMode, gameToEdit,
        activeSection, showMobileMenu, setShowMobileMenu, scrollToSection,
        formData, setFormData, handleChange, handleFileChange, handleSubmit,
        tagInput, setTagInput, suggestedTags, handleTagKeyDown, addTag, handleRemoveTag,
        previewImg, isAnimating
    };
};