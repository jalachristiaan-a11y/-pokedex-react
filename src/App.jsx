import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("pokedex");

  const [pokemonList, setPokemonList] = useState([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [selectedRegionIndex, setSelectedRegionIndex] = useState(0);
  const [regionData, setRegionData] = useState(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationPokemon, setLocationPokemon] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const BATCH_SIZE = 40;

  const types = [
    "all", "normal", "fire", "water", "grass", "electric", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  const regions = [
    { name: "kanto", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" },
    { name: "johto", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/155.png" },
    { name: "hoenn", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/252.png" },
    { name: "sinnoh", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/387.png" },
    { name: "unova", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/495.png" },
    { name: "kalos", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/650.png" },
    { name: "alola", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/722.png" },
    { name: "galar", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/810.png" },
    { name: "paldea", mapUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/906.png" }
  ];

  const currentType = types[selectedTypeIndex];
  const currentRegion = regions[selectedRegionIndex];

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

  useEffect(() => {
    fetchRegionData(currentRegion.name);
  }, [selectedRegionIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRegionData = async (regionName) => {
    setRegionLoading(true);
    setSelectedLocation("");
    setLocationPokemon([]);
    setIsDropdownOpen(false);
    try {
      const res = await axios.get(`https://pokeapi.co/api/v2/region/${regionName}`);
      setRegionData(res.data);
    } catch (error) {
      console.error("Error fetching region data:", error);
    }
    setRegionLoading(false);
  };

  const handleLocationChange = async (locName) => {
    setSelectedLocation(locName);
    setIsDropdownOpen(false);
    if (!locName) {
      setLocationPokemon([]);
      return;
    }

    setLocationLoading(true);
    setLocationPokemon([]);
    try {
      const locRes = await axios.get(`https://pokeapi.co/api/v2/location/${locName}`);
      const areaUrls = locRes.data.areas.map((a) => a.url);

      const areaRequests = areaUrls.map((url) => axios.get(url));
      const areaResponses = await Promise.all(areaRequests);

      const pokeSet = new Map();
      areaResponses.forEach((res) => {
        res.data.pokemon_encounters.forEach((pe) => {
          const id = pe.pokemon.url.split("/").filter(Boolean).pop();
          pokeSet.set(id, {
            id: parseInt(id, 10),
            name: pe.pokemon.name,
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
          });
        });
      });

      setLocationPokemon(Array.from(pokeSet.values()).sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error("Error fetching location details:", error);
    }
    setLocationLoading(false);
  };

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
          type: data.types[0]?.type?.name || "normal",
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

  const handleCardClick = async (poke) => {
    setSelectedPokemon(poke);
    setModalLoading(true);
    try {
      const detailsRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${poke.id}`);
      const details = detailsRes.data;

      const statMap = {};
      details.stats.forEach((s) => {
        statMap[s.stat.name] = s.base_stat;
      });
      
      const movesList = details.moves.slice(0, 10).map((m) =>
        m.move.name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );

      setModalData({
        height: details.height / 10,
        weight: details.weight / 10,
        baseExperience: details.base_experience || "N/A",
        types: details.types.map((t) => t.type.name),
        abilities: details.abilities.map((a) =>
          a.ability.name
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        ),
        stats: {
          hp: statMap["hp"] || 0,
          attack: statMap["attack"] || 0,
          defense: statMap["defense"] || 0,
          specialAttack: statMap["special-attack"] || 0,
          specialDefense: statMap["special-defense"] || 0,
          speed: statMap["speed"] || 0,
        },
        moves: movesList,
      });
    } catch (error) {
      console.error("Error fetching modal details:", error);
    }
    setModalLoading(false);
  };

  const handleCloseModal = () => {
    setSelectedPokemon(null);
    setModalData(null);
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

  const handlePrevRegion = () => {
    setSelectedRegionIndex((prev) => (prev === 0 ? regions.length - 1 : prev - 1));
  };

  const handleNextRegion = () => {
    setSelectedRegionIndex((prev) => (prev === regions.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={`app-container ${activeTab}`}>
      <h1>Pokédex</h1>

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "pokedex" ? "active" : ""}`}
          onClick={() => setActiveTab("pokedex")}
        >
          Pokédex View
        </button>
        <button
          className={`tab-btn ${activeTab === "region" ? "active" : ""}`}
          onClick={() => setActiveTab("region")}
        >
          Region Explorer
        </button>
      </div>

      {activeTab === "region" && (
        <div className="region-explorer-section">
          <div className="type-carousel-container">
            <button className="carousel-arrow" onClick={handlePrevRegion}>◀</button>
            <div className="type-display-box all">
              {currentRegion.name.toUpperCase()} REGION
            </div>
            <button className="carousel-arrow" onClick={handleNextRegion}>▶</button>
          </div>

          <div className="region-banner">
            <img src={currentRegion.mapUrl} alt={currentRegion.name} className="region-starter-img" />
            <div className="region-details">
              <label className="dropdown-label">
                Select a Location in {currentRegion.name.toUpperCase()}:
              </label>
              {regionLoading ? (
                <p className="loading-text">Loading locations...</p>
              ) : (
                <div className="custom-select-container" ref={dropdownRef}>
                  <div 
                    className={`custom-select-header ${isDropdownOpen ? "open" : ""}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span>
                      {selectedLocation 
                        ? selectedLocation.replace(/-/g, " ").toUpperCase() 
                        : "-- Choose a Location --"}
                    </span>
                    <span className="dropdown-arrow">▼</span>
                  </div>

                  {isDropdownOpen && (
                    <div className="custom-select-menu">
                      <div 
                        className="custom-select-item"
                        onClick={() => handleLocationChange("")}
                      >
                        -- Choose a Location --
                      </div>
                      {regionData?.locations.map((loc) => (
                        <div
                          key={loc.name}
                          className={`custom-select-item ${selectedLocation === loc.name ? "selected" : ""}`}
                          onClick={() => handleLocationChange(loc.name)}
                        >
                          {loc.name.replace(/-/g, " ").toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedLocation && (
            <div className="location-encounters-box">
              <h3>Pokémon found in: {selectedLocation.replace(/-/g, " ").toUpperCase()}</h3>
              {locationLoading ? (
                <p className="status-text">Loading Pokémon encounters...</p>
              ) : locationPokemon.length > 0 ? (
                <div className="location-poke-grid">
                  {locationPokemon.map((p) => (
                    <div key={p.id} className="location-poke-card" onClick={() => handleCardClick(p)}>
                      <img src={p.image} alt={p.name} />
                      <span>#{String(p.id).padStart(3, "0")} {p.name.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="status-text">No wild encounter data available for this location.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "pokedex" && (
        <>
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
                <div 
                  key={poke.id} 
                  className={`tcg-card ${primaryType !== "all" ? primaryType : "normal"}`}
                  onClick={() => handleCardClick(poke)}
                >
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

          {!loading && pokemonList.length === 0 && searchTerm && (
            <p className="status-text">No Pokémon found matching "{searchTerm}"</p>
          )}

          {!loading && currentType === "all" && !searchTerm && hasMore && (
            <button className="load-more-btn" onClick={handleLoadMore}>
              Load More Pokémon
            </button>
          )}
        </>
      )}

      {selectedPokemon && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="pokedex-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              ✕
            </button>

            <div className="pokedex-modal-header">
              <span className="modal-poke-id">
                #{String(selectedPokemon.id).padStart(3, "0")}
              </span>
              <h2 className="modal-poke-title">
                {selectedPokemon.name.toUpperCase()}
              </h2>
            </div>

            {modalLoading ? (
              <p className="modal-loading">Loading Pokémon details...</p>
            ) : (
              modalData && (
                <div className="pokedex-modal-body">
                  <div className="modal-left-col">
                    <div className="modal-artwork-container">
                      <img
                        src={selectedPokemon.image}
                        alt={selectedPokemon.name}
                      />
                    </div>

                    <div className="modal-section-box">
                      <h4>Type</h4>
                      <div className="modal-pill-group">
                        {modalData.types.map((t, idx) => (
                          <span key={`${t}-${idx}`} className={`type-badge ${t}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="modal-section-box">
                      <h4>Abilities</h4>
                      <div className="modal-pill-group">
                        {modalData.abilities.map((ability, idx) => (
                          <span key={`${ability}-${idx}`} className="info-pill">
                            {ability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="modal-right-col">
                    <div className="modal-section-box">
                      <h4>Basic Information</h4>
                      <div className="basic-info-grid">
                        <div className="info-card">
                          <span className="info-card-label">Height</span>
                          <span className="info-card-val">
                            {modalData.height} m
                          </span>
                        </div>
                        <div className="info-card">
                          <span className="info-card-label">Weight</span>
                          <span className="info-card-val">
                            {modalData.weight} kg
                          </span>
                        </div>
                        <div className="info-card">
                          <span className="info-card-label">Base XP</span>
                          <span className="info-card-val">
                            {modalData.baseExperience}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="modal-section-box">
                      <h4>Statistics</h4>
                      <div className="stat-bars-wrapper">
                        <div className="stat-line">
                          <span className="stat-title">HP</span>
                          <div className="stat-bar-bg">
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${Math.min((modalData.stats.hp / 180) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="stat-num">{modalData.stats.hp}</span>
                        </div>

                        <div className="stat-line">
                          <span className="stat-title">Attack</span>
                          <div className="stat-bar-bg">
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${Math.min((modalData.stats.attack / 180) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="stat-num">
                            {modalData.stats.attack}
                          </span>
                        </div>

                        <div className="stat-line">
                          <span className="stat-title">Defense</span>
                          <div className="stat-bar-bg">
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${Math.min((modalData.stats.defense / 180) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="stat-num">
                            {modalData.stats.defense}
                          </span>
                        </div>

                        <div className="stat-line">
                          <span className="stat-title">Special Attack</span>
                          <div className="stat-bar-bg">
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${Math.min((modalData.stats.specialAttack / 180) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="stat-num">
                            {modalData.stats.specialAttack}
                          </span>
                        </div>

                        <div className="stat-line">
                          <span className="stat-title">Special Defense</span>
                          <div className="stat-bar-bg">
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${Math.min((modalData.stats.specialDefense / 180) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="stat-num">
                            {modalData.stats.specialDefense}
                          </span>
                        </div>

                        <div className="stat-line">
                          <span className="stat-title">Speed</span>
                          <div className="stat-bar-bg">
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${Math.min((modalData.stats.speed / 180) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="stat-num">
                            {modalData.stats.speed}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="modal-section-box">
                      <h4>Moves</h4>
                      <div className="moves-grid-container">
                        {modalData.moves.map((move, index) => (
                          <span key={index} className="move-chip">
                            {move}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;