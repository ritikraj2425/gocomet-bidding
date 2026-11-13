import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, Col, Row, Spin, Typography } from 'antd';
import { ArrowRightOutlined, CheckCircleFilled, ClockCircleOutlined, DollarOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';

const { Title, Text, Paragraph } = Typography;

export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="route-loading"><Spin /><span>Preparing your workspace…</span></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="supplier-home">
      <header className="home-nav">
        <BrandLogo />
        <div className="home-nav-actions">
          <Link to="/login" className="home-signin">Sign in</Link>
          <Link to="/register" className="home-join">Join the network <ArrowRightOutlined /></Link>
        </div>
      </header>
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="hero-pulse" /> CARRIER PARTNER PORTAL</div>
          <Title>Move more freight.<br /><span>Win better business.</span></Title>
          <Paragraph>One clear place to discover freight opportunities, submit competitive quotes, and track every bid in real time.</Paragraph>
          <div className="hero-actions">
            <Link to="/register" className="home-cta">Create your carrier account <ArrowRightOutlined /></Link>
            <Link to="/login" className="hero-login">Already a partner? Sign in</Link>
          </div>
          <div className="trust-line"><CheckCircleFilled /> Transparent bidding <span>·</span> Real-time updates <span>·</span> Built for carriers</div>
        </div>
        <div className="hero-visual" aria-label="Freight auction dashboard preview">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="route-node node-a" /><div className="route-node node-b" /><div className="route-line" />
          <Card className="preview-card" bordered={false}>
            <div className="preview-top"><span className="preview-label">LIVE OPPORTUNITY</span><span className="preview-live"><i /> OPEN</span></div>
            <div className="preview-route"><div><small>ORIGIN</small><b>Mumbai</b></div><div className="route-arrow">→</div><div><small>DESTINATION</small><b>Bengaluru</b></div></div>
            <div className="preview-divider" />
            <div className="preview-bottom"><div><small>YOUR RANK</small><b className="rank-value">#1 <span>Leading</span></b></div><div className="preview-amount"><small>YOUR QUOTE</small><b>₹ 48,500</b></div></div>
            <div className="preview-countdown"><ClockCircleOutlined /> Auction closes in <strong>08:42</strong></div>
          </Card>
          <div className="floating-chip"><ThunderboltOutlined /> Live ranking</div>
          <div className="floating-check"><SafetyCertificateOutlined /></div>
        </div>
      </section>
      <section className="how-section">
        <div className="how-inner">
          <div className="how-heading"><span>BUILT FOR YOUR NEXT MOVE</span><Title level={2}>A simpler way to win the right freight.</Title><Text>From first look to final quote, keep the important details close.</Text></div>
          <Row gutter={[20, 20]} className="steps-row">
            <Col xs={24} md={8}><article className="step-card"><div className="step-number">01 <span><ThunderboltOutlined /></span></div><Title level={4}>Discover</Title><Text>Explore open freight opportunities with the route, timing, and shipment details up front.</Text><div className="step-rule" /></article></Col>
            <Col xs={24} md={8}><article className="step-card"><div className="step-number">02 <span><DollarOutlined /></span></div><Title level={4}>Compete</Title><Text>Submit your quote with a clear view of your current position in the live auction.</Text><div className="step-rule" /></article></Col>
            <Col xs={24} md={8}><article className="step-card"><div className="step-number">03 <span><CheckCircleFilled /></span></div><Title level={4}>Stay on top</Title><Text>Follow ranking changes, closing times, and every quote from one carrier workspace.</Text><div className="step-rule" /></article></Col>
          </Row>
        </div>
      </section>
      <section className="home-closer">
        <div className="closer-glow" />
        <div className="closer-copy"><span>READY WHEN YOU ARE</span><Title level={2}>Put your fleet in the running.</Title><Text>Create your account to explore available freight and start quoting.</Text></div>
        <Link to="/register" className="closer-button">Join the carrier network <ArrowRightOutlined /></Link>
      </section>
      <footer className="home-footer"><BrandLogo /><Text>Clear opportunities. Confident quoting.</Text><Link to="/login">Partner sign in <ArrowRightOutlined /></Link></footer>
    </main>
  );
}
