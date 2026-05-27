import { useEffect, useRef } from "react";

import keyboardShortcutsService from "@/services/keyboardShortcutsService";

const KeyboardShortcutsProvider = () => {
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    keyboardShortcutsService.register(
      "searchBar",
      "k",
      () => {
        window.dispatchEvent(new CustomEvent("focusSearchBar"));
      },
      { ctrlKey: true },
    );

    keyboardShortcutsService.register(
      "addGame",
      "n",
      () => {
        if (!window.location.pathname.includes("add"))
          window.location.href = "/game/add-edit-game";
      },
      { ctrlKey: true, altKey: true },
    );

    keyboardShortcutsService.register(
      "dashboard",
      "d",
      () => {
        if (window.location.pathname !== "/dashboard")
          window.location.href = "/dashboard";
      },
      { ctrlKey: true },
    );

    keyboardShortcutsService.register(
      "gamesList",
      "l",
      () => {
        if (window.location.pathname !== "/list")
          window.location.href = "/list";
      },
      { ctrlKey: true },
    );

    keyboardShortcutsService.register(
      "profile",
      "p",
      () => {
        if (window.location.pathname !== "/profile")
          window.location.href = "/profile";
      },
      { ctrlKey: true },
    );

    keyboardShortcutsService.register(
      "categories",
      "c",
      () => {
        if (window.location.pathname !== "/categories")
          window.location.href = "/categories";
      },
      { ctrlKey: true },
    );

    keyboardShortcutsService.register(
      "statistics",
      "s",
      () => {
        if (window.location.pathname !== "/statistics")
          window.location.href = "/statistics";
      },
      { ctrlKey: true },
    );

    keyboardShortcutsService.register(
      "trophies",
      "t",
      () => {
        if (window.location.pathname !== "/trophies")
          window.location.href = "/trophies";
      },
      { ctrlKey: true, altKey: true },
    );

    keyboardShortcutsService.register(
      "help",
      "h",
      () => {
        window.dispatchEvent(new CustomEvent("showKeyboardHelp"));
      },
      { ctrlKey: true },
    );
  }, []);

  return null;
};

export default KeyboardShortcutsProvider;
