import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const BATCH_SIZE = 40;

  const types = [
    "all", "normal", "fire", "water", "grass", "electric", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  const currentType = types[selectedTypeIndex];

  useEffect(() => {
    setOffset(0);
    setPokemonList([]);
    setHasMore(true);
    
    if (searchTerm.trim() === "") {
      if (currentType === "all") {
        fetchAllPokemon(0, true);
      } else {
        fetchPokemonByType(currentType);
      }
    } else {
      const delayDebounce = setTimeout(() => {
        searchPokemonByName(searchTerm.toLowerCase().trim());
      }, 400);

      return () => clearTimeout(delayDebounce);
    }
  }, [selectedTypeIndex, searchTerm]);

  const fetchAllPokemon = async (currentOffset, isInitial = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `https://pokeapi.co/api/v2/pokemon?limit=${BATCH_SIZE}&offset=${currentOffset}`
      );

      const newPokemon = response.data.results.map((p) => {
        const id = p.url.split("/").filter(Boolean).pop();
        return {
          id: parseInt(id, 10),
          name: p.name,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        };
      });

      if (newPokemon.length < BATCH_SIZE) {
        setHasMore(false);
      }

      setPokemonList((prev) => (isInitial ? newPokemon : [...prev, ...newPokemon]));
    } catch (error) {
      console.error("Error fetching all Pokemon:", error);
    }
    setLoading(false);
  };

  const fetchPokemonByType = async (type) => {
    setLoading(true);
    setPokemonList([]);
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/type/${type}`);
      
      const typePokemon = response.data.pokemon.map((p) => {
        const id = p.pokemon.url.split("/").filter(Boolean).pop();
        return {
          id: parseInt(id, 10),
          name: p.pokemon.name,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
          type: type,
        };
      });

      typePokemon.sort((a, b) => a.id - b.id);
      setPokemonList(typePokemon);
      setHasMore(false);
    } catch (error) {
      console.error("Error fetching Pokemon by type:", error);
    }
    setLoading(false);
  };

  const searchPokemonByName = async (name) => {
    setLoading(true);
    setPokemonList([]);
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
      const data = response.data;
      setPokemonList([
        {
          id: data.id,
          name: data.name,
          image: data.sprites.other["official-artwork"].front_default || data.sprites.front_default,
          type: data.types[0].type.name,
          hp: data.stats.find((s) => s.stat.name === "hp")?.base_stat,
        },
      ]);
      setHasMore(false);
    } catch (error) {
      console.error("Pokemon not found:", error);
      setPokemonList([]);
    }
    setLoading(false);
  };

  const handleLoadMore = () => {
    const nextOffset = offset + BATCH_SIZE;
    setOffset(nextOffset);
    fetchAllPokemon(nextOffset, false);
  };

  const handlePrevType = () => {
    setSearchTerm("");
    setSelectedTypeIndex((prev) => (prev === 0 ? types.length - 1 : prev - 1));
  };

  const handleNextType = () => {
    setSearchTerm("");
    setSelectedTypeIndex((prev) => (prev === types.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="app-container">
      <h1>Pokédex</h1>

      <div className="type-carousel-container">
        <button className="carousel-arrow" onClick={handlePrevType} title="Previous Type">
          ◀
        </button>
        <div className={`type-display-box ${currentType}`}>
          {currentType === "all" ? "ALL POKÉMON" : currentType.toUpperCase()}
        </div>
        <button className="carousel-arrow" onClick={handleNextType} title="Next Type">
          ▶
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search Pokémon name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="pokemon-grid">
        {pokemonList.map((poke) => {
          const primaryType = poke.type || currentType;
          return (
            <div key={poke.id} className={`tcg-card ${primaryType !== "all" ? primaryType : "normal"}`}>
              <div className="card-header">
                <span className="stage">#{String(poke.id).padStart(3, "0")}</span>
                <span className="poke-name">{poke.name.toUpperCase()}</span>
                <span className="hp-val">HP {poke.hp || 60}</span>
              </div>

              <div className="card-image-box">
                <img src={poke.image} alt={poke.name} loading="lazy" />
              </div>

              <div className="card-moves">
                <div className="move-row">
                  <span className="move-label">Primary</span>
                  <span className="move-name">Tackle</span>
                </div>
                <div className="move-row">
                  <span className="move-label">Secondary</span>
                  <span className="move-name">Quick Attack</span>
                </div>
              </div>

              <div className="card-footer">
                <span>Weakness </span>
                <span>Resistance </span>
                <span>Retreat </span>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p className="status-text">Loading Pokémon...</p>}

      {!loading && currentType === "all" && !searchTerm && hasMore && (
        <button className="load-more-btn" onClick={handleLoadMore}>
          Load More Pokémon
        </button>
      )}
    </div>
  );
}

export default App;