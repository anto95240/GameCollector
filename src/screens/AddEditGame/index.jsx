import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router"; // CORRECTION: Retour à react-router
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faArrowLeft, faImage, faGamepad, faStar, faList, 
    faCheckCircle, faTag, faPlus, faTimes, faBars 
} from "@fortawesome/free-solid-svg-icons";

import FloatingInput from "../../components/common/FloatingInput";
import CustomSelect from "../../components/common/CustomSelect";
import LoadingButton from "../../components/common/LoadingButton";
import "./addEditGame.css";

const SECTIONS = [
    { id: "desc", icon: faList, label: "gameForm.sections.description" },
    { id: "rate", icon: faStar, label: "gameForm.sections.rating" },
    { id: "detail", icon: faGamepad, label: "gameForm.sections.details" },
    { id: "img", icon: faImage, label: "gameForm.sections.image" },
    { id: "status", icon: faCheckCircle, label: "gameForm.sections.status" },
    { id: "tags", icon: faTag, label: "gameForm.sections.tags" },
];

const MOCK_OPTIONS = {
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

const AddEditGamePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    
    const gameToEdit = location.state?.game; 
    const isEditMode = !!gameToEdit;

    // --- STATES ---
    const [activeSection, setActiveSection] = useState("desc");
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    
    // States Tags
    const [tagInput, setTagInput] = useState("");
    const [suggestedTags, setSuggestedTags] = useState([]);
    
    const isScrollingRef = useRef(false);

    const [formData, setFormData] = useState({
        name: "", description: "", rating: "", comment: "",
        genre: "", platform: "", year: "", playTime: "",
        developer: "", achievements: "", status: "", tags: [], image: null
    });

    const [previewImg, setPreviewImg] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

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
            // On compense le header (environ 140px défini dans le CSS scroll-margin-top)
            const triggerPoint = scrollY + 150; 
            
            // Détection bas de page
            if ((window.innerHeight + scrollY) >= document.body.offsetHeight - 50) {
               setActiveSection(SECTIONS[SECTIONS.length - 1].id);
               return;
            }

            // Détection par section
            for (const section of SECTIONS) {
                const element = document.getElementById(section.id);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    // Note: offsetTop est relatif au parent positionné le plus proche, 
                    // mais ici, dans une page standard, cela correspond souvent au haut du document
                    // ou on utilise getBoundingClientRect pour être sûr.
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

    // --- NAVIGATION MENU ---
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (!element) return;

        isScrollingRef.current = true;
        setActiveSection(id);
        setShowMobileMenu(false);

        // On utilise la méthode native qui respecte le 'scroll-margin-top' du CSS
        element.scrollIntoView({ behavior: "smooth", block: "start" });

        setTimeout(() => {
            isScrollingRef.current = false;
        }, 1000);
    };

    // --- TAGS ---
    useEffect(() => {
        if (tagInput.trim() === "") {
            setSuggestedTags([]);
        } else {
            const lowerInput = tagInput.toLowerCase();
            const suggestions = AVAILABLE_TAGS.filter(tag => 
                tag.toLowerCase().includes(lowerInput) && 
                !formData.tags.includes(tag)
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

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsAnimating(true);
        setTimeout(() => {
            setIsAnimating(false);
            navigate("/list");
        }, 1500);
    };

    return (
        <div className="add-edit-page fade-in">
            {/* HEADER */}
            <header className="page-header">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <FontAwesomeIcon icon={faArrowLeft} /> <span>{t('common.back')}</span>
                </button>
                <h1 className="page-title">
                    {isEditMode ? `Modification de ${gameToEdit?.name}` : t('gameForm.addTitle')}
                </h1>
                <div className="spacer"></div>
            </header>

            <div className="page-content">
                
                {/* MENU BUREAU */}
                <aside className="sidebar-nav desktop-only">
                    {SECTIONS.map((section) => (
                        <button 
                            key={section.id} 
                            onClick={() => scrollToSection(section.id)} 
                            className={`nav-anchor ${activeSection === section.id ? 'active' : ''}`}
                            type="button" /* IMPORTANT : Empêche le submit du formulaire */
                        >
                            <FontAwesomeIcon icon={section.icon} />
                            <span>{t(section.label)}</span>
                        </button>
                    ))}
                </aside>

                {/* MENU MOBILE */}
                {showMobileMenu && (
                    <div className="mobile-nav-overlay fade-in" onClick={() => setShowMobileMenu(false)}>
                        <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
                            <h3>Navigation</h3>
                            {SECTIONS.map((section) => (
                                <button 
                                    key={section.id} 
                                    onClick={() => scrollToSection(section.id)} 
                                    className={`mobile-nav-item ${activeSection === section.id ? 'active' : ''}`}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={section.icon} />
                                    <span>{t(section.label)}</span>
                                </button>
                            ))}
                            <button className="close-menu-btn" onClick={() => setShowMobileMenu(false)} type="button">
                                <FontAwesomeIcon icon={faTimes} /> Fermer
                            </button>
                        </div>
                    </div>
                )}

                {/* FORMULAIRE */}
                <form className="form-container" onSubmit={handleSubmit}>
                    
                    {/* DESCRIPTION */}
                    <div id="desc" className="form-section">
                        <h3>{t('gameForm.sections.description')}</h3>
                        <FloatingInput 
                            name="name" label={t('gameForm.fields.name')} 
                            value={formData.name} onChange={handleChange} required 
                        />
                        <div className="textarea-group">
                            <label>{t('gameForm.fields.description')}</label>
                            <textarea 
                                name="description" rows="4" 
                                value={formData.description} onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* NOTATION */}
                    <div id="rate" className="form-section">
                        <h3>{t('gameForm.sections.rating')}</h3>
                        <div className="select-wrapper">
                            <label>{t('gameForm.fields.rating')}</label>
                            <CustomSelect 
                                options={MOCK_OPTIONS.rating} 
                                value={formData.rating} 
                                onChange={(val) => setFormData({...formData, rating: val})} 
                            />
                        </div>
                        <div className="textarea-group mt-4">
                            <label>{t('gameForm.fields.comment')}</label>
                            <textarea 
                                name="comment" rows="3" 
                                value={formData.comment} onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* DETAIL */}
                    <div id="detail" className="form-section">
                        <h3>{t('gameForm.sections.details')}</h3>
                        <div className="form-grid">
                            <div className="select-wrapper">
                                <label>{t('gameForm.fields.genre')}</label>
                                <CustomSelect 
                                    options={MOCK_OPTIONS.genre} 
                                    value={formData.genre} 
                                    onChange={(val) => setFormData({...formData, genre: val})} 
                                />
                            </div>
                            <div className="select-wrapper">
                                <label>{t('gameForm.fields.platform')}</label>
                                <CustomSelect 
                                    options={MOCK_OPTIONS.platform} 
                                    value={formData.platform} 
                                    onChange={(val) => setFormData({...formData, platform: val})} 
                                />
                            </div>
                            <FloatingInput 
                                name="year" label={t('gameForm.fields.releaseYear')} type="number"
                                value={formData.year} onChange={handleChange} 
                            />
                            <FloatingInput 
                                name="playTime" label="Temps de jeu (h)" type="number"
                                value={formData.playTime} onChange={handleChange} 
                            />
                            <FloatingInput 
                                name="developer" label="Développeur"
                                value={formData.developer} onChange={handleChange} 
                            />
                            <FloatingInput 
                                name="achievements" label="Succès (ex: 45/50)"
                                value={formData.achievements} onChange={handleChange} 
                            />
                        </div>
                    </div>

                    {/* IMAGE */}
                    <div id="img" className="form-section">
                        <h3>{t('gameForm.sections.image')}</h3>
                        <div className="image-upload-area">
                            <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} hidden />
                            <label htmlFor="file-upload" className="upload-label">
                                {previewImg ? (
                                    <img src={previewImg} alt="Preview" className="img-preview" />
                                ) : (
                                    <div className="upload-placeholder">
                                        <FontAwesomeIcon icon={faImage} size="2x" />
                                        <p>Glisser ou cliquer pour ajouter</p>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* STATUS */}
                    <div id="status" className="form-section">
                        <h3>{t('gameForm.sections.status')}</h3>
                        <CustomSelect 
                            options={MOCK_OPTIONS.status} 
                            value={formData.status} 
                            onChange={(val) => setFormData({...formData, status: val})} 
                        />
                    </div>

                    {/* TAGS */}
                    <div id="tags" className="form-section">
                        <h3>{t('gameForm.sections.tags')}</h3>
                        
                        {formData.tags.length > 0 && (
                            <div className="tags-preview-container">
                                {formData.tags.map((tag, index) => (
                                    <span key={index} className="tag-badge">
                                        {tag}
                                        <button type="button" onClick={() => handleRemoveTag(tag)} className="tag-remove-btn">
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="tag-input-wrapper" style={{position: 'relative', display: 'flex', gap: '10px', alignItems: 'flex-end'}}>
                            <div style={{flex: 1, position: 'relative'}}>
                                <FloatingInput 
                                    name="tagInput" 
                                    label="Rechercher ou créer un tag..." 
                                    value={tagInput} 
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    autocomplete="off"
                                />
                                
                                {suggestedTags.length > 0 && (
                                    <div className="tags-suggestions-dropdown">
                                        {suggestedTags.map((suggestion, index) => (
                                            <div 
                                                key={index} 
                                                className="tag-suggestion-item"
                                                onClick={() => addTag(suggestion)}
                                            >
                                                <FontAwesomeIcon icon={faTag} size="xs" style={{marginRight: 8, opacity: 0.7}} />
                                                {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <button type="button" className="btn-add-tag" onClick={() => addTag(tagInput)}>
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="form-actions-footer">
                        <LoadingButton 
                            text={isEditMode ? t('gameForm.buttons.save') : t('gameForm.buttons.add')}
                            isAnimating={isAnimating}
                            showLoading={false}
                        />
                    </div>

                </form>
            </div>

            {/* BOUTON FLOTTANT MOBILE */}
            <button 
                className="floating-menu-btn mobile-only" 
                onClick={() => setShowMobileMenu(true)}
                type="button"
            >
                <FontAwesomeIcon icon={faBars} />
            </button>
        </div>
    );
};

export default AddEditGamePage;