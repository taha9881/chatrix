import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Features from '../components/Features'
import Steps from '../components/Steps'
import UploadZone from '../components/UploadZone'
import Footer from '../components/Footer'
import ParticlesBg from '../components/ParticlesBg'

export default function Landing() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <ParticlesBg />
      <Navbar />
      <Hero />
      <Features />
      <Steps />
      <UploadZone />
      <Footer />
    </div>
  )
}
