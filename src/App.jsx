import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#E50914', '#221F1F', '#B81D24', '#F5F5F1', '#8c8c8c']

const normalizeText = (value) => (value ?? '').toString().trim()

const splitValues = (value) =>
  normalizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const countByField = (rows, field, { split = false, limit = 10 } = {}) => {
  const counts = new Map()

  rows.forEach((row) => {
    const values = split ? splitValues(row[field]) : [normalizeText(row[field])]

    values
      .filter((value) => value && value !== 'Unknown')
      .forEach((value) => {
        counts.set(value, (counts.get(value) || 0) + 1)
      })
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }))
}

const buildYearTrend = (rows) => {
  const counts = new Map()

  rows.forEach((row) => {
    const year = Number(row.release_year)
    if (!Number.isNaN(year)) {
      counts.set(year, (counts.get(year) || 0) + 1)
    }
  })

  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, total]) => ({ year, total }))
}

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value)

function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('All')
  const [ratingFilter, setRatingFilter] = useState('All')
  const [genreFilter, setGenreFilter] = useState('All')

  useEffect(() => {
    const loadCsv = async () => {
      try {
        const response = await fetch('/data/netflix_titles.csv')
        const csvText = await response.text()

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const cleaned = result.data.map((row) => ({
              ...row,
              title: normalizeText(row.title),
              type: normalizeText(row.type) || 'Unknown',
              country: normalizeText(row.country) || 'Unknown',
              rating: normalizeText(row.rating) || 'Unknown',
              listed_in: normalizeText(row.listed_in) || 'Unknown',
              duration: normalizeText(row.duration) || 'Unknown',
              release_year: Number(row.release_year) || 0,
            }))
            setRows(cleaned)
            setLoading(false)
          },
          error: (parseError) => {
            setError(parseError.message)
            setLoading(false)
          },
        })
      } catch (fetchError) {
        setError(fetchError.message)
        setLoading(false)
      }
    }

    loadCsv()
  }, [])

  const filterOptions = useMemo(() => {
    return {
      countries: ['All', ...new Set(rows.flatMap((row) => splitValues(row.country)).filter(Boolean))].slice(0, 30),
      ratings: ['All', ...new Set(rows.map((row) => row.rating).filter(Boolean))],
      genres: ['All', ...new Set(rows.flatMap((row) => splitValues(row.listed_in)).filter(Boolean))].slice(0, 30),
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesTab = activeTab === 'All' || row.type === activeTab
      const matchesSearch = !search || row.title.toLowerCase().includes(search.toLowerCase())
      const matchesCountry =
        countryFilter === 'All' || splitValues(row.country).includes(countryFilter)
      const matchesRating = ratingFilter === 'All' || row.rating === ratingFilter
      const matchesGenre = genreFilter === 'All' || splitValues(row.listed_in).includes(genreFilter)

      return matchesTab && matchesSearch && matchesCountry && matchesRating && matchesGenre
    })
  }, [rows, activeTab, search, countryFilter, ratingFilter, genreFilter])

  const kpis = useMemo(() => {
    const totalTitles = filteredRows.length
    const avgYear =
      totalTitles > 0
        ? Math.round(filteredRows.reduce((sum, row) => sum + row.release_year, 0) / totalTitles)
        : 0
    const movieCount = filteredRows.filter((row) => row.type === 'Movie').length
    const tvCount = filteredRows.filter((row) => row.type === 'TV Show').length
    const uniqueCountries = new Set(filteredRows.flatMap((row) => splitValues(row.country))).size

    return {
      totalTitles,
      avgYear,
      movieCount,
      tvCount,
      uniqueCountries,
    }
  }, [filteredRows])

  const lineData = useMemo(() => buildYearTrend(filteredRows), [filteredRows])
  const countryData = useMemo(
    () => countByField(filteredRows, 'country', { split: true, limit: 10 }),
    [filteredRows]
  )
  const pieData = useMemo(() => countByField(filteredRows, 'type', { limit: 5 }), [filteredRows])

  const tableData = useMemo(() => {
    return [...filteredRows]
      .sort((a, b) => b.release_year - a.release_year)
      .slice(0, 12)
  }, [filteredRows])

  const insight = useMemo(() => {
    const topCountry = countryData[0]
    const peakYear = [...lineData].sort((a, b) => b.total - a.total)[0]
    const movieShare = kpis.totalTitles
      ? ((kpis.movieCount / kpis.totalTitles) * 100).toFixed(1)
      : 0

    return {
      main: topCountry
        ? `${topCountry.name} contributes the largest number of titles in the current view.`
        : 'No dominant country found in the current filter.',
      trend: peakYear
        ? `The content release trend peaks in ${peakYear.year} with ${formatNumber(peakYear.total)} titles.`
        : 'No trend can be calculated for the current filter.',
      recommendation:
        Number(movieShare) >= 60
          ? `Movies dominate this dataset (${movieShare}%). A recommendation is to compare movie-heavy categories with TV Show growth to spot catalog opportunities.`
          : `TV Shows are relatively strong in this filter. A recommendation is to compare retention-focused series categories with broader movie content.`,
    }
  }, [countryData, lineData, kpis])

  if (loading) {
    return <div className="status-screen">Loading Netflix dashboard...</div>
  }

  if (error) {
    return <div className="status-screen">Failed to load data: {error}</div>
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Mini Project Data Visualization</p>
          <h1>Netflix Movies & TV Shows Dashboard</h1>
          <p className="subtitle">
            Interactive dashboard built with React + Recharts using the Netflix Titles dataset.
          </p>
        </div>
        <div className="hero-badge">{formatNumber(rows.length)} Records</div>
      </header>

      <section className="controls card">
        <div className="tabs">
          {['All', 'Movie', 'TV Show'].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="filters-grid">
          <input
            type="text"
            placeholder="Search title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
            {filterOptions.countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            {filterOptions.ratings.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>

          <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
            {filterOptions.genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="card kpi-card">
          <p>Total Titles</p>
          <h2>{formatNumber(kpis.totalTitles)}</h2>
        </div>
        <div className="card kpi-card">
          <p>Average Release Year</p>
          <h2>{kpis.avgYear || '-'}</h2>
        </div>
        <div className="card kpi-card">
          <p>Total Movies</p>
          <h2>{formatNumber(kpis.movieCount)}</h2>
        </div>
        <div className="card kpi-card">
          <p>Countries Represented</p>
          <h2>{formatNumber(kpis.uniqueCountries)}</h2>
        </div>
      </section>

      <section className="chart-grid">
        <div className="card chart-card large">
          <div className="card-header">
            <h3>Line Chart — Release Trend by Year</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#E50914" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h3>Bar Chart — Top 10 Countries</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={countryData} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={110} />
              <Tooltip />
              <Bar dataKey="value" fill="#B81D24" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h3>Pie Chart — Content Type Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="card">
          <div className="card-header">
            <h3>Table — Latest Titles in Current Filter</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Country</th>
                  <th>Rating</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.show_id}>
                    <td>{row.title}</td>
                    <td>{row.type}</td>
                    <td>{row.country}</td>
                    <td>{row.rating}</td>
                    <td>{row.release_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card insight-card">
          <div className="card-header">
            <h3>Insights & Recommendation</h3>
          </div>
          <div className="insight-block">
            <h4>Main Insight</h4>
            <p>{insight.main}</p>
          </div>
          <div className="insight-block">
            <h4>Trend Found</h4>
            <p>{insight.trend}</p>
          </div>
          <div className="insight-block">
            <h4>Recommendation</h4>
            <p>{insight.recommendation}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
